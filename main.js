const { connect } = require("puppeteer-real-browser");

// Accessing environment variables
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioTo = process.env.TWILIO_TO;
const twilioFrom = process.env.TWILIO_FROM;

if (!twilioAccountSid || !twilioAuthToken || !twilioTo || !twilioFrom) {
  console.error("Environment variables are missing!");
  process.exit(1);
}

(async () => {
  const { page, browser } = await connect({
    headless: false,
  });

  // Navigate to the page and solve Cloudflare challenges
  await page.goto("https://ita-schengen.idata.com.tr/tr/appointment-form", {
    waitUntil: "networkidle0",
  });

  const csrfToken = await page.evaluate(() => {
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    return metaTag ? metaTag.getAttribute("content") : null;
  });

  if (!csrfToken) {
    throw new Error("CSRF token not found");
  }

  // Use the cookies and token for further requests
  const headers = {
    "x-csrf-token": csrfToken,
    "x-requested-with": "XMLHttpRequest",
    // Add other headers as necessary
  };

  // Make a request with the authenticated session
  const response = await page.evaluate(
    async (url, headers) => {
      const OFFICES = {
        GAYRETTEPE: 1,
        ALTUNIZADE: 8,
      };

      const SERVICES = {
        STANDARD: 1,
        PREMIUM_LOUNGE: 2,
        PRIME: 4,
      };

      const VISA_TYPE = {
        TOURISM: 2,
        BUSINESS: 3,
        EDUCATION: 4,
        LOGISTICS: 5,
        OTHERS: 7,
      };

      const responseAltunizade = await (
        await fetch(url, {
          method: "POST",
          headers,
          body: `serviceType=${SERVICES.STANDARD}&totalPerson=1&getOfficeID=${OFFICES.ALTUNIZADE}&calendarType=2&getConsular=${VISA_TYPE.TOURISM}`,
        })
      ).json();

      const responseGayrettepe = await (
        await fetch(url, {
          method: "POST",
          headers,
          body: `serviceType=${SERVICES.STANDARD}&totalPerson=1&getOfficeID=${OFFICES.ALTUNIZADE}&calendarType=2&getConsular=${VISA_TYPE.TOURISM}`,
        })
      ).json();

      return { responseAltunizade, responseGayrettepe };
    },
    "https://ita-schengen.idata.com.tr/tr/getavailablefirstdate",
    headers
  );

  await browser.close();

  if (
    response.responseAltunizade.isAvailable ||
    response.responseGayrettepe.isAvailable
  ) {
    const client = require("twilio")(twilioAccountSid, twilioAuthToken);

    const message = await client.messages.create({
      body: `Italya vizesi açıldı!, Altunizade: ${
        response.responseAltunizade.isAvailable ? "AÇIK" : "KAPALI"
      }, Gayrettepe: ${
        response.responseGayrettepe.isAvailable ? "AÇIK" : "KAPALI"
      }`,
      from: twilioFrom,
      to: twilioTo,
    });

    console.log(message.sid);
  }
})();
