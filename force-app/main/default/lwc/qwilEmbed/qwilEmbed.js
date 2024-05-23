import { LightningElement } from 'lwc';
import { loadScript } from "lightning/platformResourceLoader";
import QwilApiLib from "@salesforce/resourceUrl/QwilApiLib";

export default class QwilEmbed extends LightningElement {
    api;

    async renderedCallback() {
        await loadScript(this, QwilApiLib);  // this exposes api obj on window.QwilApi
        const container = this.template.querySelector('div.qwil-container');

        this.api = new window.QwilApi({
            token: 'token', // TODO: load this from /sys-api query
            endpoint: 'https://endpoint',  // TODO: load this from /sys-api query
            targetElement: container,
            options: {
                customUrl: 'https://shawnchin.github.io/hosting/qwil-api-debug', // TODO: point to https://sdk.qwil.io
            },
            onLoad: () => {
                console.log('Qwil login successful'); // TODO: register auth-expired handler
            },
            onError: () => {
                console.error('Qwil login failed'); // TODO: error handling
            },
        });
    }
}