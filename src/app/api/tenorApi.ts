import axios from "axios";
import axiosRetry from "axios-retry";

const tenorApi = axios.create({
  baseURL: "https://tenor.googleapis.com/v2",
});

axiosRetry(tenorApi, {
  retries: 3,
  retryCondition: (error) => error.response?.status === 429,
  retryDelay: (retryCount) => {
    console.log(`retrying tenor api request... attempt #${retryCount}`);
    return 1000;
  },
});

export default tenorApi;
