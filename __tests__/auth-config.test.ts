describe("auth deployment configuration", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it("uses the browser origin instead of a stale public auth URL", async () => {
        process.env.NEXT_PUBLIC_BETTER_AUTH_URL = "https://old-hero.example.com";
        const { getClientAuthBaseUrl } = await import("@/lib/auth-config");

        expect(getClientAuthBaseUrl()).toBe(window.location.origin);
    });

    it("trusts an origin that matches the reverse-proxy host", async () => {
        const { getTrustedOrigins } = await import("@/lib/auth-config");
        const request = {
            url: "http://hero-app:3000/api/auth/sign-in/email",
            headers: new Headers({
                origin: "https://hero.example.com",
                host: "hero-app:3000",
                "x-forwarded-host": "hero.example.com",
            }),
        } as Request;

        expect(getTrustedOrigins(request)).toContain("https://hero.example.com");
    });

    it("rejects an origin that does not match the request host", async () => {
        const { getTrustedOrigins } = await import("@/lib/auth-config");
        const request = {
            url: "https://hero.example.com/api/auth/sign-in/email",
            headers: new Headers({ origin: "https://attacker.example.com" }),
        } as Request;

        expect(getTrustedOrigins(request)).not.toContain("https://attacker.example.com");
    });
});
