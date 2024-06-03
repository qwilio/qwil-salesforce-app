import { LightningElement } from 'lwc';
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

        if (this.error) {
            container.classList.remove('full-page');
            this.loaded = true;
            return;
        } 

        const { token, endpoint } = this.credentials;

        this.api = new window.QwilApi({
            token,
            endpoint,
            targetElement: container,
            options: {
                customUrl: 'https://sdk-beta.qwil.network/',
            },
            onLoad: () => {
                console.log('Qwil login successful'); // TODO: register auth-expired handler
                this.loaded = true;
            },
            onError: () => {
                console.error('Qwil login failed'); // TODO: error handling
                this.loaded = true;
            },
        });
    }

    async retrieveCredentials() {
        try {
            this.credentials = await authenticate();
        } catch (error) {
            console.error(error);
            this.error = error;
        }
    }

    async disconnectedCallback() {
        if (this.api) {
            this.api.dispose();
            this.api = null;
        }
    }

}