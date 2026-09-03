describe("whatsappService", () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.resetModules();
  });

  it("reports not configured and skips silently when env vars are unset", async () => {
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    const {
      sendWhatsAppMessage,
      isConfigured,
    } = require("../services/whatsappService");

    expect(isConfigured()).toBe(false);
    const result = await sendWhatsAppMessage({
      to: "+91 98765 43210",
      body: "Test",
    });
    expect(result).toEqual({ skipped: true });
  });

  it("reports configured once both env vars are set", () => {
    process.env.WHATSAPP_PHONE_NUMBER_ID = "123456";
    process.env.WHATSAPP_ACCESS_TOKEN = "fake-token";
    const { isConfigured } = require("../services/whatsappService");
    expect(isConfigured()).toBe(true);
  });

  it("skips (never throws) when given no usable phone number", async () => {
    const { sendWhatsAppMessage } = require("../services/whatsappService");
    const result = await sendWhatsAppMessage({ to: "", body: "Test" });
    expect(result).toEqual({ skipped: true });
  });
});
