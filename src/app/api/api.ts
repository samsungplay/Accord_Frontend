"use client";
import axios from "axios";
import Cookies from "js-cookie";
import Constants from "../constants/Constants";

const api = axios.create({ baseURL: Constants.SERVER_URL_PATH });

api.interceptors.request.use(async (config) => {
  if (config.headers) {
    //Authorization header already present
    if (config.headers["Authorization"] || config.headers["Refresh-Token"])
      return config;
  }

  // if(config.url?.startsWith("/authentication/authenticate")) {
  //     //ignore /authentication/authenticate url
  //     return config;
  // }

  // if(Cookies.get("XSRF-TOKEN")) {
  //     config.headers['X-XSRF-TOKEN'] = Cookies.get("XSRF-TOKEN")
  // }

  // await new Promise((resolve) => setTimeout(resolve, 50));

  const accessToken = Cookies.get("accord_access_token");

  config.headers = config.headers || {};
  if (accessToken) {
    config.headers["Authorization"] = "Bearer " + accessToken;
  }

  return config;
});

api.interceptors.response.use(
  (res) => {
    return res;
  },
  async (error) => {
    const res = error.response;
    const url = error.response.request.responseURL;
    const config = error.response.config;
    // console.log(res,url)

    res.headers = res.headers || {};
    const refreshToken = Cookies.get("accord_refresh_token");

    if (res.data.error === "invalid token" && refreshToken && url) {
      // console.log("refreshing token 1")
      const resp = await api.get("/authentication/authenticate", {
        headers: {
          "Refresh-Token": refreshToken,
        },
      });

      if (resp.status === 201 && resp.data["access_token"]) {
        const newAccessToken = resp.data["access_token"];

        // console.log("refreshing token 2")
        config.headers = config.headers || {};
        config.headers["Authorization"] = "Bearer " + newAccessToken;

        // console.log("requesting with config",config)
        const refreshedResp = await api.request(config);

        if (refreshedResp.status !== 401) {
          console.log("refreshing access token");
          Cookies.set("accord_access_token", newAccessToken);

          return refreshedResp;
        }
      } else {
        //refresh token expired as well
        // console.log("refresh token expired!!!!!")
        window.location.href = "/authentication";
        return res;
      }
    } else {
      //completely invalid token - shouldnt really happen
      // if (res.status === 401) window.location.href = "/authentication";
    }
    return res;
  }
);
export default api;
