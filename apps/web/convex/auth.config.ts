export default {
  providers: [
    {
      // Clerk's JWKS endpoint — replace CLERK_DOMAIN with your actual Clerk frontend API domain
      // Found in Clerk Dashboard → API Keys → Frontend API URL (e.g. "https://your-app.clerk.accounts.dev")
      domain: process.env.CLERK_ISSUER_URL,
      applicationID: "convex",
    },
  ],
};
