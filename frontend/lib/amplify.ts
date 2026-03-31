// lib/amplify.ts
import type { ResourcesConfig } from "aws-amplify";

const userPoolClientId =
  process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID ?? process.env.NEXT_PUBLIC_CLIENT_ID;
const cognitoDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI;
const hasHostedUiConfig = Boolean(cognitoDomain && redirectUri);

const awsconfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID!,
      userPoolClientId: userPoolClientId!,
      ...(hasHostedUiConfig
        ? {
            loginWith: {
              oauth: {
                domain: cognitoDomain!,
                scopes: ["openid", "email", "profile"],
                redirectSignIn: [redirectUri!],
                redirectSignOut: [redirectUri!],
                responseType: "code",
              },
            },
          }
        : {}),
    },
  },
};

export default awsconfig;