import { defineConfig } from '@apps-in-toss/web-framework/config'

export default defineConfig({
  appName: 'babdongne', // 앱인토스 콘솔에 등록된 앱 이름과 같아야 한다
  brand: {
    primaryColor: '#3182F6',
  },
  webView: {},
  permissions: [{ name: 'geolocation', access: 'access' }],
  webBundleDir: 'dist',
})
