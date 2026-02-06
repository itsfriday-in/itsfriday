import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { UserProfile } from "@/types/settings";

async function getManagementToken(): Promise<string> {
  const domain = process.env.AUTH0_TENANT_DOMAIN || process.env.AUTH0_DOMAIN!;
  const clientId = process.env.AUTH0_M2M_CLIENT_ID || process.env.AUTH0_CLIENT_ID!;
  const clientSecret = process.env.AUTH0_M2M_CLIENT_SECRET || process.env.AUTH0_CLIENT_SECRET!;

  const response = await fetch(`https://${domain}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      audience: `https://${domain}/api/v2/`,
      grant_type: "client_credentials",
    }),
  });

  const data = await response.json();
  return data.access_token;
}

interface Auth0User {
  user_id: string;
  email: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
  created_at?: string;
  updated_at?: string;
  user_metadata?: {
    normalized_name?: string;
    normalized_picture?: string | null; // null means user removed picture, undefined means never set
    given_name?: string;
    family_name?: string;
    profile_updated_at?: string;
    profile_initialized?: boolean;
  };
}

async function getUserFromManagementAPI(userId: string, email: string): Promise<Auth0User | null> {
  try {
    const token = await getManagementToken();
    const domain = process.env.AUTH0_TENANT_DOMAIN || process.env.AUTH0_DOMAIN!;

    // First try to fetch by user_id
    const response = await fetch(
      `https://${domain}/api/v2/users/${encodeURIComponent(userId)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (response.ok) {
      return response.json();
    }

    // If user not found, search by email (linked identity case)
    if (response.status === 404 && email) {
      const emailResponse = await fetch(
        `https://${domain}/api/v2/users-by-email?email=${encodeURIComponent(email)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (emailResponse.ok) {
        const users = await emailResponse.json();
        if (users && users.length > 0) {
          return users[0];
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Error fetching user from Management API:", error);
    return null;
  }
}

export async function GET() {
  try {
    const session = await auth0.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.sub || "";
    const sessionEmail = session.user.email || "";

    // Fetch user from Management API for normalized data
    const auth0User = await getUserFromManagementAPI(userId, sessionEmail);

    // Build profile with normalized data
    const userMeta = auth0User?.user_metadata || {};

    // ONLY use picture if user explicitly set one (stored in normalized_picture)
    // NEVER fall back to social provider picture - show initials instead
    // normalized_picture can be: string (user set), null (user removed), or undefined (never set)
    const profilePicture = userMeta.normalized_picture && typeof userMeta.normalized_picture === 'string' && userMeta.normalized_picture.length > 0
      ? userMeta.normalized_picture
      : undefined;

    // Priority: user_metadata > session data > fallback
    const profile: UserProfile = {
      id: auth0User?.user_id || userId,
      email: auth0User?.email || sessionEmail,
      name: userMeta.normalized_name || auth0User?.name || session.user.name || sessionEmail.split("@")[0],
      picture: profilePicture,
      emailVerified: auth0User?.email_verified ?? session.user.email_verified ?? false,
      createdAt: auth0User?.created_at,
      updatedAt: auth0User?.updated_at,
      user_metadata: userMeta,
    };

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth0.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, picture } = body;

    // Validate that at least one field is provided
    if (name === undefined && picture === undefined) {
      return NextResponse.json(
        { error: "Name or picture is required" },
        { status: 400 }
      );
    }

    // Validate name if provided
    if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
      return NextResponse.json(
        { error: "Invalid name provided" },
        { status: 400 }
      );
    }

    // Validate picture if provided (should be base64 data URL, http URL, or empty string for removal)
    if (picture !== undefined && picture !== "") {
      if (typeof picture !== "string") {
        return NextResponse.json(
          { error: "Invalid picture data" },
          { status: 400 }
        );
      }
      // Check if it's a valid data URL or starts with http (existing URL)
      if (!picture.startsWith("data:image/") && !picture.startsWith("http")) {
        return NextResponse.json(
          { error: "Invalid picture format" },
          { status: 400 }
        );
      }
      // Check size limit (roughly 500KB for base64)
      if (picture.length > 700000) {
        return NextResponse.json(
          { error: "Picture is too large. Please use a smaller image." },
          { status: 400 }
        );
      }
    }

    const token = await getManagementToken();
    const domain = process.env.AUTH0_TENANT_DOMAIN || process.env.AUTH0_DOMAIN!;
    const userId = session.user.sub || "";
    const sessionEmail = session.user.email || "";

    // Get the primary user (in case of linked accounts)
    const auth0User = await getUserFromManagementAPI(userId, sessionEmail);
    const primaryUserId = auth0User?.user_id || userId;

    // Update user_metadata
    const existingMeta = auth0User?.user_metadata || {};
    const updatedMeta: Record<string, unknown> = {
      ...existingMeta,
      profile_updated_at: new Date().toISOString(),
    };

    if (name) {
      updatedMeta.normalized_name = name.trim();
    }

    if (picture !== undefined) {
      // Empty string means remove picture, otherwise set the new picture
      updatedMeta.normalized_picture = picture || null;
    }

    const updateData = {
      user_metadata: updatedMeta,
    };

    const response = await fetch(
      `https://${domain}/api/v2/users/${encodeURIComponent(primaryUserId)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("Update profile error:", error);
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }

    const updatedUser = await response.json();
    const finalMeta = updatedUser.user_metadata || {};

    // ONLY use picture if user explicitly set one (stored in normalized_picture)
    // NEVER fall back to social provider picture - show initials instead
    const profilePicture = finalMeta.normalized_picture && typeof finalMeta.normalized_picture === 'string' && finalMeta.normalized_picture.length > 0
      ? finalMeta.normalized_picture
      : undefined;

    const profile: UserProfile = {
      id: updatedUser.user_id,
      email: updatedUser.email,
      name: finalMeta.normalized_name || updatedUser.name || sessionEmail.split("@")[0],
      picture: profilePicture,
      emailVerified: updatedUser.email_verified ?? false,
      createdAt: updatedUser.created_at,
      updatedAt: updatedUser.updated_at,
      user_metadata: finalMeta,
    };

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const session = await auth0.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = await getManagementToken();
    const domain = process.env.AUTH0_TENANT_DOMAIN || process.env.AUTH0_DOMAIN!;
    const userId = session.user.sub || "";
    const sessionEmail = session.user.email || "";

    // Get the primary user (in case of linked accounts)
    const auth0User = await getUserFromManagementAPI(userId, sessionEmail);
    const primaryUserId = auth0User?.user_id || userId;

    // Delete the user
    const response = await fetch(
      `https://${domain}/api/v2/users/${encodeURIComponent(primaryUserId)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok && response.status !== 204) {
      const error = await response.json();
      console.error("Delete user error:", error);
      return NextResponse.json(
        { error: "Failed to delete account" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Account deleted successfully" });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
