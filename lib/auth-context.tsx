const login = async (email: string, password: string) => {
  try {
    setLoading(true);
    setError(null);

    // 1️⃣ Sign in with Cognito
    const signInResult = await signIn({ username: email, password });

    if (!signInResult?.isSignedIn) {
      throw new Error('Authentication failed');
    }

    // 2️⃣ Get authenticated user
    const currentUser = await getCurrentUser();

    const userPayload = {
      userID: currentUser.userId,
      email: currentUser.signInDetails?.loginId || '',
      name: currentUser.username,
    };

    // 3️⃣ Call API Gateway -> Lambda -> DynamoDB
    const response = await fetch(
      'https://9bxi8jswh3.execute-api.us-east-1.amazonaws.com/prod',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userPayload),
      }
    );

    // 4️⃣ Handle API response safely
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('User sync failed:', errorData);
      // We DO NOT block login if Dynamo write fails
    }

    // 5️⃣ Update local auth state
    await checkUser();

  } catch (err: any) {
    const isUnconfirmed =
      err?.name === 'UserNotConfirmedException' ||
      err?.message?.includes('User is not confirmed');

    const errorMessage = isUnconfirmed
      ? 'Please verify your email first'
      : err?.name === 'NotAuthorizedException'
      ? 'Incorrect email or password'
      : err?.message || 'Login failed';

    setError(errorMessage);
    throw new Error(errorMessage);
  } finally {
    setLoading(false);
  }
};
