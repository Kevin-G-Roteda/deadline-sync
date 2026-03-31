import { NextRequest } from 'next/server';

type DecodedClaims = {
  sub: string;
  email?: string;
  name?: string;
};

function getAuthorizationHeader(request: NextRequest): string {
  return request.headers.get('authorization') || request.headers.get('Authorization') || '';
}

function decodeClaimsFromHeader(header: string): DecodedClaims | null {
  if (!header.toLowerCase().startsWith('bearer ')) {
    return null;
  }

  try {
    const token = header.slice(7).trim();
    const [, payload] = token.split('.');
    if (!payload) {
      return null;
    }

    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sub?: string;
      email?: string;
      name?: string;
    };

    if (!decoded?.sub) {
      return null;
    }

    return {
      sub: decoded.sub,
      email: decoded.email,
      name: decoded.name,
    };
  } catch {
    return null;
  }
}

export function getAuthenticatedUserFromRequest(request: NextRequest): DecodedClaims {
  const claims = decodeClaimsFromHeader(getAuthorizationHeader(request));

  if (!claims?.sub) {
    throw new Error('UNAUTHORIZED');
  }

  return claims;
}
