// const allWords = '[\\w\\s!@#$%*^&.?.,<>\\-\\)\\(\\]\\[\\:\\/]'
// const allWordsNoSpace = '[\\w!@#$%*^&.?.,<>\\-\\)\\(\\]\\[\\:\\/]'
// const allWordsNoSyntax = '[a-zA-Z0-9.\\s!@$%^&.?.,<\\)\\(\\)\\]\\[\\:]'
// const allWordsNoSpaceNoSyntax = '[a-zA-Z0-9.!@$%^&.?.,<\\)\\(\\)\\]\\[\\:]'

// const allWords = '[^\\n\\r]'
// const allWordsNoSpace = '[^\\n\\r\\s]'
// const allWordsNoSyntax = "[^\\n\\r*_#\\-\\>\\']"
// const allWordsNoSpaceNoSyntax = "[^\\n\\r*_#\\-\\>\\'\\s]"
// const allWordsNoAsterisk = '[^\\n\\r\\s*]'

const urlRegex =
  "https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)";

const SERVER_URL_PATH =
  process.env["ACCORD_ENV"] === "prod"
    ? "https://api.accordapp.online"
    : "http://localhost:8080";
const Constants = {
  SERVER_STATIC_CONTENT_PATH: `${SERVER_URL_PATH}/content/`,
  SERVER_ATTACHMENT_CONTENT_PATH: `${SERVER_URL_PATH}/download/attachments/`,
  CONSOLE_SUPPRESS_WARNINGS: [
    "contains an input of type text with both value and defaultValue props.",
    "Function components cannot be given refs.",
  ],
  SERVER_URL_PATH: SERVER_URL_PATH,
  CLIENT_URL_PATH:
    process.env["ACCORD_ENV"] === "prod"
      ? "https://accordapp.online"
      : "http://localhost:3000",
  CLIENT_PER_PAGE_COUNT: 20,
  CLIENT_MAX_PAGES: 7,

  italicRe: new RegExp(
    `[\\*][^\\n\\r\\s*_]+[^\\n\\r*_]*[^\\n\\r\\s*_]*[\\*]`,
    "g"
  ),
  boldRe: new RegExp(
    `\\*\\*[^\\n\\r\\s*]+[^\\n\\r*]*[^\\n\\r\\s*]*\\*\\*`,
    "g"
  ),
  underlineRe: new RegExp(
    `\\_\\_[^\\n\\r\\s_]+[^\\n\\r_]*[^\\n\\r\\s_]*\\_\\_`,
    "g"
  ),
  boldItalicRe: new RegExp(
    `\\*\\*\\*[^\\n\\r\\s*]+[^\\n\\r*]*[^\\n\\r\\s*]*\\*\\*\\*`,
    "g"
  ),
  underlineItalicsRe: new RegExp(
    `\\_\\_\\*[^\\n\\r\\s*_]+[^\\n\\r*_]*[^\\n\\r\\s*_]*\\*\\_\\_`,
    "g"
  ),
  underlineBoldRe: new RegExp(
    `\\_\\_\\*\\*[^\\n\\r\\s*_]+[^\\n\\r*_]*[^\\n\\r\\s*_]*\\*\\*\\_\\_`,
    "g"
  ),
  underlineBoldItalicsRe: new RegExp(
    `\\_\\_\\*\\*\\*[^\\n\\r\\s*_]+[^\\n\\r*_]*[^\\n\\r\\s*_]*\\*\\*\\*\\_\\_`,
    "g"
  ),
  strikethroughRe: new RegExp(
    `\\-\\-[^\\n\\r\\s\\-]+[^\\n\\r\\-]*[^\\n\\r\\s\\-]*\\-\\-`,
    "g"
  ),
  heading1Re: new RegExp(`^#\\s[^\\n\\r]+`, "g"),
  heading2Re: new RegExp(`^##\\s[^\\n\\r]+`, "g"),
  heading3Re: new RegExp(`^###\\s[^\\n\\r]+`, "g"),
  subTextRe: new RegExp(`^\\-#\\s[^\\n\\r]+`, "g"),
  maskedLinkeRe: new RegExp(`\\[[^\\n\\r]+\\]\\(${urlRegex}\\)`, "g"),
  listRe: new RegExp(`^[\\-#\\s>]*[\\-]\\s[^\\n\\r\\-]+`, "g"),
  blockQuoteRe: new RegExp(`^[\\-#\\s]*>\\s[^\\n\\r]*`, "g"),
  codeRe: new RegExp(
    `\\'[^\\n\\r\\s\\']+[^\\n\\r\\']*[^\\n\\r\\s\\']*\\'`,
    "g"
  ),
  multilineCodeRe: new RegExp(
    `\\'\\'\\'[^\\n\\r\\s\\']+[^\\']*[^\\n\\r\\'\\s]*\\'\\'\\'`,
    "g"
  ),
  emojiRe: new RegExp(`:[\\w+\\-]+[\\w\\-+][\\w\\-+]*:`, "g"),
  emojiSearchRe: new RegExp(`:[\\w+\\-]+[\\w\\-+][\\w\\-+]*`, "g"),
  urlRe: new RegExp(urlRegex, "g"),
  urlEntireMatchRe: new RegExp("^" + urlRegex + "$", "g"),
  fileNameRe: new RegExp("^[\\w\\-. ]+$"),
  mentionRe: new RegExp(
    `\\[m\\][^\\n\\r\\s\\[m\\]]+[^\\n\\r\\[m\\]]*[^\\n\\r\\s\\[\\m\\]]*\\[m\\]`,
    "g"
  ),
  spoilerRe: new RegExp(`\\|\\|[^\\n\\r|]+\\|\\|`, "g"),
  emoticonRe: new RegExp(
    "(?<=\\s|^)(:\\)|:\\(|:D|:P|:O|:\\||;-\\)|;\\)|:-\\/|:\\/|:'\\)|XD|<3|<\\/3|:3|B-\\)|:\\^\\)|:V|o:\\)|O:\\)|T_T|:x|<o)(?=\\s|$|\\W)",
    "g"
  ),
  emoticonConvertMap: {
    ":)": ":smile:",
    ":(": ":pensive:",
    ":D": ":smile:",
    ":P": ":stuck_out_tongue:",
    ":O": ":open_mouth:",
    ":|": ":netural_face:",
    ";-)": ":wink:",
    ";)": ":wink:",
    ":/": ":confused:",
    ":-/": ":confused",
    ":')": ":cry:",
    XD: ":laughing:",
    "<3": ":heart:",
    "</3": ":broken_heart:",
    ":3": ":cat:",
    "B-)": ":sunglasses:",
    ":^)": ":blush:",
    ":V": ":smirk:",
    "o:)": ":innocent:",
    "O:)": ":innocent:",
    T_T: ":sob:",
    ":x": ":kissing_heart:",
    "<o": ":bird:",
  },
  iceServerConfig: {
    iceServers: [],
  },
  TENOR_API_KEY: "AIzaSyAq52pWI87pR5nsADYvVEvUQoB_OkubGIY",
};

//initialize the ice server config
// const init = async () => {
//   // Calling the REST API TO fetch the TURN Server Credentials
//   const response = await fetch(
//     "https://accord.metered.live/api/v1/turn/credentials?apiKey=e58762b94183971ef9081b3167cba9304343"
//   );

//   // Saving the response in the iceServers array
//   const iceServers = await response.json();

//   Constants.iceServerConfig = {
//     iceServers: iceServers,
//   };

//   console.log("ICE server config initialized;");
//   console.log(Constants.iceServerConfig);
// };

// init();

Constants.SERVER_STATIC_CONTENT_PATH = `${Constants.SERVER_URL_PATH}/content/`;

export default Constants;
