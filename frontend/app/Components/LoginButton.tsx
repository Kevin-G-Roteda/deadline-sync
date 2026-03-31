"use client";

import { Amplify } from "aws-amplify";
import { signInWithRedirect } from "aws-amplify/auth";
import awsconfig from "../../lib/amplify";

// Configure Amplify here (only in client)
Amplify.configure(awsconfig);

export default function LoginButton() {
  const handleLogin = async () => {
    if (
      !process.env.NEXT_PUBLIC_COGNITO_DOMAIN ||
      !process.env.NEXT_PUBLIC_REDIRECT_URI
    ) {
      console.error(
        "Missing Hosted UI config: set NEXT_PUBLIC_COGNITO_DOMAIN and NEXT_PUBLIC_REDIRECT_URI."
      );
      return;
    }

    try {
      await signInWithRedirect();
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  return (
    <button
      onClick={handleLogin}
      style={{
        padding: "10px 20px",
        backgroundColor: "#4F46E5",
        color: "white",
        borderRadius: "6px",
        cursor: "pointer",
        marginTop: "20px",
      }}
    >
      Login with Cognito
    </button>
  );
}