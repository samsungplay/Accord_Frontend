import axios from "axios";

import Constants from "../constants/Constants";

const api = axios.create({
  baseURL: Constants.SERVER_URL_PATH,
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => {
    return res;
  },
  async (error) => {
    const res = error.response;

    if (res.status === 401) {
      window.location.href = "/authentication";
    }

    return res;
  }
);
export default api;
