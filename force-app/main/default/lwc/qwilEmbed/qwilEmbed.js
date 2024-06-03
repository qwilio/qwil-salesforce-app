import { LightningElement } from 'lwc';
import Toast from 'lightning/toast';
import { loadScript } from "lightning/platformResourceLoader";
import QwilApiLib from "@salesforce/resourceUrl/QwilApiLib";
import authenticate from '@salesforce/apex/QwilSdkAuth.authenticate';

export default class QwilEmbed extends LightningElement {
    api;
    error;
    credentials;
    loaded = false;


    async connectedCallback() {
        await Promise.all([
            loadScript(this, QwilApiLib),  // this exposes api obj on window.QwilApi
            this.retrieveCredentials(), // this populates either this.credentials or this.error
        ]);
        
        const container = this.template.querySelector('div.qwil-container');

        // Handle case where we fail to get SDK token from Apex call
        if (this.error) {
            container.classList.remove('full-page');
            this.loaded = true;
            return;
        } 

        // If no error, credentials should have been populated
        const { token, endpoint } = this.credentials;

        this.api = new window.QwilApi({
            token,
            endpoint,
            targetElement: container,
            options: {
                // TODO: remove this custom URL when prod endpoint released
                customUrl: 'https://sdk-beta.qwil.network/',
            },
            onLoad: (api) => {
                console.log('Qwil login successful'); 
                this.loaded = true;

                // Handle auth expiry while app is rendered
                api.on('auth-expired', async (payload) => {
                    console.warn('Qwil session expired. Reauthenticating.'); 

                    await this.retrieveCredentials();
                    if (!this.error) {
                        const { token, endpoint } = this.credentials;
                        api.reauthenticate({ token, endpoint });
                    }
                });

                // Display in-app error events as toast
                api.on('app-error', ({message}) => {
                    this.showErrorToast(message);
                })
            },
            // Handle error case where we have token from Apex call, but we fail to load Qwil using said token.
            onError: () => {
                this.error = 'Login to Qwil failed'
                this.loaded = true;
            },
        });
    }

    async retrieveCredentials() {
        try {
            this.credentials = await authenticate();
        } catch (error) {
            console.error(error);
            this.error = error?.body?.message || "Load failed";
        }
    }

    async disconnectedCallback() {
        if (this.api) {
            this.api.dispose();
            this.api = null;
        }
    }

    showErrorToast(message) {
        Toast.show({
            label: 'Qwil Chat',
            message,
            mode: 'dismissable',
            variant: 'warning'
        }, this);
    }
}
