import axios from "axios";
import { Environment } from "@/environment";

import {
  errorInterceptor,
  responseInterceptor
} from "@/services/interceptors";

const api = axios.create({
  baseURL: Environment.URL_BASE
});

api.interceptors.response.use(
  (response) => responseInterceptor(response),
  (error) => errorInterceptor(error)
);

export default api;
