# Qwil Salesforce App

This is an example Salesforce DX project then embeds Qwil as a Lightning Web Component.

It consists of the following elements:
1. The [QwilSdkAuth](force-app/main/default/classes/QwilSdkAuth.cls) Apex class
    * This does the callout to Qwil Sys API to retrieve an SDK session token for the current authenticated user.
    * This example assumes that the associated Qwil user has its identifier set to the Salesforce User ID.
2. The [QwilApiLib.js](force-app/main/default/staticresources/QwilApiLib.js) static resource
    * This is a copy of the [Qwil IFrame API](https://github.com/qwilio/qwil-iframe-api).
3. The [qwilEmbed](force-app/main/default/lwc/qwilEmbed/) Lightning Web Component
    * This calls `QwilSdkAuth.authenticate()` to retrieve a session token, then uses the Qwil IFrame API to embed a light version of Qwil.
4. The [Qwil](force-app/main/default/aura/Qwil/Qwil.cmp) Aura component
    * This is a very light wrapper around the `qwilEmbed` LWC, which allows us to add it as a salesforce tab without additional paddings around the component.

## Setup 
1. Deploy project to org 
    ```
    sf project deploy start
    ```
2. In Qwil, create a System API Key that has permissions for "This key can create SDK tokens".
3. In the Salesforce org, create an External Credential for the Qwil System API Key.
   * Under "Setup > Named Credentials", select the "External Credentials" tab and create a new entry
       * Choose an appropriate Label and Name
       * Authentication Protocol: Custom
       * Add a Pricipal - "Qwil SDK"
       * Add the following Custom Headers and provide values for your API key:
          * `X-SYS-API-KEY`
          * `X-SYS-API-KEY-SECRET`
4. Create a Named Creadential that will be used for the Qwil Sys API callout
   * Under "Setup > Named Credentials", select the "Named Credentials" tab and create a new entry
       * Name: `QwilSysApiSDKAuth`
       * Label: `Qwil Sys API (SDK Auth)`
       * URL: `https://<REGION>.qwil.io/entity-service/sys-api/sdk/sessions/create`.
       * Enabled for Callouts: checked
       * Authentication: Select the external credential created in the previous step
       * Under Callout Options, **uncheck** "Generate Authorization Header"
5. Give profiles access to the callout
   * Under "Setup > Users > Profiles", for each profile that is allowed to use Qwil:
       * Select the profile
       * Edit "Enabled External Credential Pricipal Access" and add the External Credential created in previous steps
6. Give profiles access to the Apex class
   * Under "Setup > Users > Profiles", for each profile that is allowed to use Qwil:
       * Select the profile
       * Edit "Apex Class Access" and add the 'QwilSdkAuth' Apex class
8. Add *.qwil.io to Trusted URLs to avoid CSP issues
   * Under "Setup > Trusted URLs", click "New Trusted URL"
       * Api Name: Qwil
       * URL: https://*.qwil.io
       * CSP Context: All
       * CSP Directives: select "frame-src" and "img-src"
9. Create a Tab for Qwil
   * Under "Setup > Tabs", create a new "Lightning Component Tab".
   * Lightning Component: `c:Qwil`
10. Add the Tab to app
   * Under "Setup > App Manager", add the tab to the desired project(s)
