// Using absolute path for require
const { setIcon } = require('/app/siyuan-plugin-templater/index.js');

const docId = "testdoc-dummy-12345";
// The specific URL-like string to test
const iconString = "api/icon/getDynamicIcon?type=1&color=%23d23f31&date=2023-10-27";

async function runTest() {
  console.log(`Attempting to set icon for docId: ${docId} with icon: ${iconString}`);
  try {
    const response = await setIcon(docId, iconString);
    console.log("api.setIcon call completed.");
    console.log("Response:", JSON.stringify(response, null, 2)); // Log the full response

    if (response && response.code === 0) {
      console.log("SUCCESS: API call reported success (code 0). This implies Siyuan's backend accepted the string without immediate client-side or server-side format validation errors during the setBlockAttrs call.");
    } else if (response && response.code !== 0) {
      console.log(`FAILURE: API call reported failure code ${response.code}. Message: ${response.msg}`);
    } else {
      console.log("UNKNOWN: API call returned an unexpected response structure.", response);
    }
  } catch (error) {
    console.error("ERROR: api.setIcon call threw an exception.");
    console.error("Error details:", error); // Log the full error object

    if (error.cause && error.cause.code === 'ECONNREFUSED') {
        console.log("DETAILED ERROR: Connection refused. Siyuan backend is likely not running or not accessible at http://127.0.0.1:6806.");
    } else if (error.message && (error.message.includes('fetch failed') || error.message.includes('undici'))) {
         console.log("DETAILED ERROR: Fetch failed. This could be due to network issues, Siyuan backend not running, or the URL being malformed from the server's perspective.");
    } else {
        console.log("DETAILED ERROR: An unexpected error occurred during the fetch operation.");
    }
  }
}

runTest();
