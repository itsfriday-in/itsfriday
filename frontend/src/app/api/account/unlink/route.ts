import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

interface UnlinkRequest {
  provider: string;
  userId: string;
}

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

async function getPrimaryUserId(email: string, token: string): Promise<string | null> {
  const domain = process.env.AUTH0_TENANT_DOMAIN || process.env.AUTH0_DOMAIN!;

  const response = await fetch(
    `https://${domain}/api/v2/users-by-email?email=${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (response.ok) {
    const users = await response.json();
    if (users && users.length > 0) {
      return users[0].user_id;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth0.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: UnlinkRequest = await request.json();
    const { provider, userId } = body;

    if (!provider || !userId) {
      return NextResponse.json(
        { error: "Provider and userId are required" },
        { status: 400 }
      );
    }

    const token = await getManagementToken();
    const domain = process.env.AUTH0_TENANT_DOMAIN || process.env.AUTH0_DOMAIN!;
    const email = session.user.email;

    if (!email) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    // Get the primary user ID (in case we're logged in with a linked identity)
    const primaryUserId = await getPrimaryUserId(email, token);

    if (!primaryUserId) {
      return NextResponse.json(
        { error: "Could not find user account" },
        { status: 404 }
      );
    }

    // Check how many identities the user has
    const userResponse = await fetch(
      `https://${domain}/api/v2/users/${encodeURIComponent(primaryUserId)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!userResponse.ok) {
      return NextResponse.json(
        { error: "Could not fetch user data" },
        { status: 500 }
      );
    }

    const userData = await userResponse.json();

    if (userData.identities.length <= 1) {
      return NextResponse.json(
        { error: "Cannot unlink your only sign-in method" },
        { status: 400 }
      );
    }

    // Prevent unlinking the primary identity
    const primaryIdentity = userData.identities[0];
    if (primaryIdentity.provider === provider && primaryIdentity.user_id === userId) {
      return NextResponse.json(
        { error: "Cannot unlink primary identity. Change your primary login method first." },
        { status: 400 }
      );
    }

    // Unlink the identity
    const unlinkResponse = await fetch(
      `https://${domain}/api/v2/users/${encodeURIComponent(primaryUserId)}/identities/${provider}/${userId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!unlinkResponse.ok) {
      const errorData = await unlinkResponse.text();
      console.error("Unlink error:", errorData);
      return NextResponse.json(
        { error: "Failed to unlink account" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Account unlinked successfully" });
  } catch (error) {
    console.error("Error unlinking identity:", error);
    return NextResponse.json(
      { error: "Failed to unlink identity" },
      { status: 500 }
    );
  }
}
