import { onRequest as __api_esim_ts_onRequest } from "/Users/jordanmok/Desktop/iCloud Drive/Cursor Codes/Evair-H5/functions/api/esim.ts"
import { onRequest as __api_send_esim_email_ts_onRequest } from "/Users/jordanmok/Desktop/iCloud Drive/Cursor Codes/Evair-H5/functions/api/send-esim-email.ts"
import { onRequest as __api_stripe_checkout_ts_onRequest } from "/Users/jordanmok/Desktop/iCloud Drive/Cursor Codes/Evair-H5/functions/api/stripe-checkout.ts"
import { onRequest as __api_stripe_verify_ts_onRequest } from "/Users/jordanmok/Desktop/iCloud Drive/Cursor Codes/Evair-H5/functions/api/stripe-verify.ts"
import { onRequest as __api_track_ts_onRequest } from "/Users/jordanmok/Desktop/iCloud Drive/Cursor Codes/Evair-H5/functions/api/track.ts"
import { onRequest as __r_ts_onRequest } from "/Users/jordanmok/Desktop/iCloud Drive/Cursor Codes/Evair-H5/functions/r.ts"
import { onRequest as __r_2_ts_onRequest } from "/Users/jordanmok/Desktop/iCloud Drive/Cursor Codes/Evair-H5/functions/r 2.ts"

export const routes = [
    {
      routePath: "/api/esim",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_esim_ts_onRequest],
    },
  {
      routePath: "/api/send-esim-email",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_send_esim_email_ts_onRequest],
    },
  {
      routePath: "/api/stripe-checkout",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_stripe_checkout_ts_onRequest],
    },
  {
      routePath: "/api/stripe-verify",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_stripe_verify_ts_onRequest],
    },
  {
      routePath: "/api/track",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_track_ts_onRequest],
    },
  {
      routePath: "/r",
      mountPath: "/",
      method: "",
      middlewares: [],
      modules: [__r_ts_onRequest],
    },
  {
      routePath: "/r 2",
      mountPath: "/",
      method: "",
      middlewares: [],
      modules: [__r_2_ts_onRequest],
    },
  ]