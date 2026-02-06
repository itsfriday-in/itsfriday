import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { ConnectedAccount, getProviderFromConnection } from "@/types/settings";

interface Auth0Identity {
  connection: string;
  user_id: string;
  provider: string;
  isSocial?: boolean;
  profileData?: {
    email?: string;
    email_verified?: boolean;
  };
}

interface Auth0User {
  user_id: string;
  email: string;
  identities: Auth0Identity[];
  last_login?: string;
  last_ip?: string;
}

async function getManagementToken(): Promise<string> {
  // Use tenant domain for Management API (not custom domain)
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

    // If user not found (likely logged in with linked identity), search by email
    // This finds the primary user that has all linked identities
    if (response.status === 404 && email) {
      console.log("User not found by ID, searching by email...");
      const emailResponse = await fetch(
        `https://${domain}/api/v2/users-by-email?email=${encodeURIComponent(email)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (emailResponse.ok) {
        const users = await emailResponse.json();
        // Return the first user (should be the primary account with all linked identities)
        if (users && users.length > 0) {
          return users[0];
        }
      }
    }

    console.error("Management API error:", await response.text());
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
    const primaryEmail = session.user.email || "";

    // Fetch user from Management API to get all linked identities
    // Pass email for fallback search if user ID lookup fails (linked identity case)
    const auth0User = await getUserFromManagementAPI(userId, primaryEmail);

    let identities: ConnectedAccount[];

    // Determine which identity was used for current login
    const currentProvider = userId.split("|")[0] || "";

    if (auth0User && auth0User.identities && auth0User.identities.length > 0) {
      // Use Management API data - this has all linked identities
      // Filter out the database connection (Username-Password-Authentication)
      // as it's internal for password storage, not a visible login method
      const visibleIdentities = auth0User.identities.filter(
        (identity) => identity.connection !== "Username-Password-Authentication"
      );

      identities = visibleIdentities.map((identity, index) => {
        const identityId = `${identity.provider}|${identity.user_id}`;
        const isCurrentLogin = identity.provider === currentProvider ||
          (currentProvider === "email" && identity.connection === "email");

        return {
          id: identityId,
          provider: getProviderFromConnection(identity.connection),
          email: identity.profileData?.email || primaryEmail,
          isPrimary: index === 0,
          connection: identity.connection,
          userId: identity.user_id,
          lastUsed: isCurrentLogin && auth0User.last_login ? auth0User.last_login : undefined,
        };
      });
    } else {
      // Fallback to session data
      identities = [
        {
          id: userId,
          provider: getProviderFromConnection(userId.split("|")[0] || ""),
          email: primaryEmail,
          isPrimary: true,
          connection: userId.split("|")[0] || "",
          userId: userId.split("|")[1] || "",
        },
      ];
    }

    return NextResponse.json({
      identities,
      primaryIdentity: identities[0]?.id || null,
    });
  } catch (error) {
    console.error("Error fetching identities:", error);
    return NextResponse.json(
      { error: "Failed to fetch identities" },
      { status: 500 }
    );
  }
}
