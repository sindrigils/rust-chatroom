import axios from "axios";
import camelcaseKeys from "camelcase-keys";

const instance = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/v1`,
  withCredentials: true,
});

// Convert incoming data to camelCase
instance.interceptors.response.use(
  (response) => {
    if (response.config.responseType === "blob") {
      return response;
    }

    if (response.data) {
      response.data = camelcaseKeys(response.data, { deep: true });
    }
    return response;
  },
  (error) => Promise.reject(error)
);

const externalInstance = axios.create();

export const request = instance;
export const externalRequest = externalInstance;
