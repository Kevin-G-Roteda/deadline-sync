const login = async (email: string, password: string) => {
  try {
    setLoading(true);
    setError(null);

    // 1️⃣ Sign in with Cognito
    await signIn({ username: email, password });

    await new Promise((r) => setTimeout(r, 0));

    // 2️⃣ Get authenticated user
    const currentUser = await getCurrentUser();

    // 3️⃣ Call API Gateway -> Lambda -> DynamoDB
    await fetch('https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userID: currentUser.userId,
        email: currentUser.signInDetails?.loginId || '',
        name: currentUser.username,
      }),
    });

    // 4️⃣ Update local state
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
