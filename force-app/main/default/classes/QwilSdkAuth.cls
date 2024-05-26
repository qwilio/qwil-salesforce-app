public with sharing class QwilSdkAuth {

    static final Map<String, String> knownErrors = new Map<String, String>{
        'RB035' => 'Could not locate your Qwil account', // matches profile that cannot log in
        'RN006' => 'Could not locate your Qwil account', // not found
        
        'RF024' => 'Your Qwil account is currently inactive', // Qwil user is not currently active
        'RN900' => 'Qwil is currently disabled for this organisation', // Org is inactive in Qwil

        'RB785' => 'Configuration error. Please contact your system admin.', // identifier or entity_user_xref_uuid not included in the API call
        'RF731' => 'Configuration error. Please contact your system admin.', // System API Key does not have permission to create SDK sessions
        'RF841' => 'Configuration error. Please contact your system admin.' // Cannot set on-behalf-of-entity-uuid. Not Super API key
    };

    @AuraEnabled(cacheable=false)
    public static Map<String, String> authenticate() {
        // We assume that users in Qwil have identifiers set to match Salesforce User ID
        string userId = UserInfo.getUserId();
        string jsonBody = '{"identifier": "' + userId + '"}';

        HttpRequest req = new HttpRequest();
        req.setEndpoint('callout:QwilSysApiSDKAuth');
        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/json');
        req.setBody(jsonBody);

        Http http = new Http();
        HTTPResponse res = http.send(req);
        System.debug(res.getBody());
        Map<String, Object> resultMap = (Map<String, Object>)JSON.deserializeUntyped(res.getBody());
        
        if (res.getStatusCode() == 200) {
            return new Map<String, String>{
                'token' => (String) resultMap.get('sdk_token'),
                'endpoint' => (String) resultMap.get('api_base_url'),
                'entityUuid' => (String) resultMap.get('entity_uuid'),
                'entityUserXrefUuid' => (String) resultMap.get('entity_user_xref_uuid')
            };
        } else {
            String errorCode = (String) resultMap.get('error_code');
            System.debug('API call failed with status ' + res.getStatusCode() + ' and error code ' + errorCode);
            
            if (knownErrors.containsKey(errorCode)) {
                throw new AuraHandledException((String) knownErrors.get(errorCode));
            } else {
                throw new AuraHandledException('Failed to retrieve Qwil credentials');
            }
        }
    }

}