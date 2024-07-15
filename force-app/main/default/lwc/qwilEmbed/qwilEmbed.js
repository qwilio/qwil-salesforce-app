import { LightningElement, api } from 'lwc';
import Toast from 'lightning/toast';
import { loadScript } from "lightning/platformResourceLoader";
import QwilApiLib from "@salesforce/resourceUrl/QwilApiLib";
import authenticate from '@salesforce/apex/QwilSdkAuth.authenticate';
import FORM_FACTOR from '@salesforce/client/formFactor';

export default class QwilEmbed extends LightningElement {
    @api optionsPath;
    @api optionsContactsTappable;
    @api optionsImagePreview;
    @api optionsPdfPreview;
    @api optionsEmitDownloads;
    @api optionsEmitMeetingJoin;
    @api optionsChatListTitle;
    @api optionsChatListLogo;
    @api optionsEmitChatListBack;
    @api optionsHideChatBack;
    @api optionsThemeBubbleBgColour;
    @api optionsThemeBubbleTextColour;
    @api optionsThemeBubbleLinkColour;
    @api optionsThemeBubbleBgColour2;
    @api optionsThemeBubbleTextColour2;
    @api optionsThemeBubbleLinkColour2;

    api;
    error;
    credentials;
    loaded = false;

    get options() {
        return {
            path: this.optionsPath || '',
            contactsTappable: this.optionsContactsTappable || false,
            imagePreview: this.optionsImagePreview || true,
            pdfPreview: this.optionsPdfPreview || true,
            emitDownloads: this.optionsEmitDownloads || false,
            emitMeetingJoin: this.optionsEmitMeetingJoin || false,
            chatListTitle: this.optionsChatListTitle || '',
            chatListLogo: this.optionsChatListLogo || '',
            emitChatListBack: this.optionsEmitChatListBack || false,
            hideChatBack: this.optionsHideChatBack || false,
            theme: {
                bubbleBgColour: this.optionsThemeBubbleBgColour || '',
                bubbleTextColour: this.optionsThemeBubbleTextColour || '',
                bubbleLinkColour: this.optionsThemeBubbleLinkColour || '',
                bubbleBgColour2: this.optionsThemeBubbleBgColour2 || '',
                bubbleTextColour2: this.optionsThemeBubbleTextColour2 || '',
                bubbleLinkColour2: this.optionsThemeBubbleLinkColour2 || ''
            }
        };
    }

    async connectedCallback() {
        await Promise.all([
            loadScript(this, QwilApiLib),  // this exposes api obj on window.QwilApi
            this.retrieveCredentials(), // this populates either this.credentials or this.error
        ]);

        console.log(QwilApiLib);
        const container = this.template.querySelector('div.qwil-container');

        // Handle case where we fail to get SDK token from Apex call
        if (this.error) {
            container.classList.remove('full-page');
            this.loaded = true;
            return;
        } 

        // If no error, credentials should have been populated
        const { token, endpoint } = this.credentials;
        this.options.emitDownloads = !this.isRunningOnDesktop(); // on mobile downloads from iframe do not work so we handle on this end.

        this.api = new QwilApi({
            token,
            endpoint,
            options: this.options,
            targetElement: container,
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

                // this only works if contactsTappable option is set
                api.on('click-on-contact', (payload) => {
                    // Crude example. But you can do a lot more with this, e.g. lookup associated salesforce contact and display in modal.
                    this.showContactToast(payload);
                });

                // Display in-app error events as toast
                api.on('app-error', ({message}) => {
                    this.showErrorToast(message);
                });

                // Downloads triggered from within the iFrame does not work on SF mobile, so we handle it here
                api.on('download-request', ({filename, url}) => this.downloadFileFromUrl(url, filename));

                // Opening extrernal window from iFrame does not work on SF mobile, so we handle it here
                api.on("meeting-join", ({ url }) => this.openUrlInNewWindow(url));
            },
            // Handle error case where we have token from Apex call, but we fail to load Qwil using said token.
            onError: () => {
                this.error = 'Login to Qwil failed'
                this.loaded = true;
            },
        });
    }

    isRunningOnDesktop() {
        return FORM_FACTOR === 'Large';
    }

    downloadFileFromUrl(url, filename) {
        const downloadContainer = this.template.querySelector('.download-container');
        const element = document.createElement('a');
        element.href = url;
        element.download = filename;
        downloadContainer.append(element);
        element.click();
        downloadContainer.removeChild(element);
    }

    openUrlInNewWindow(url) {
        //// window.open behaves strangely on Android SF app. It first navigates to blank page before open, leave app in bad state
        // window.open(url, '_blank')
        const downloadContainer = this.template.querySelector('.download-container');
        const element = document.createElement('a');
        element.href = url;
        element.target = '_blank';
        downloadContainer.append(element);
        element.click();
        downloadContainer.removeChild(element);
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
            this.api.destroy();
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

    showContactToast(payload) {
        const message = 'Salesforce app received event with payload ' + JSON.stringify(payload);
        Toast.show({
            label: 'Qwil click-on-contact',
            message,
            mode: 'dismissable',
            variant: 'success'
        }, this);
    }
}
