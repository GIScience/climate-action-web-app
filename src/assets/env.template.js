;(function (window) {
    window.env = window.env || {}

    window['env']['ENVIRONMENT_TYPE'] = '${ENVIRONMENT_TYPE}'
    window['env']['CLIMATE_ACTION_API_URL'] = '${CLIMATE_ACTION_API_URL}'
    window['env']['ORS_API_KEY'] = '${ORS_API_KEY}'
    window['env']['APPWRITE_PROJECT_ID'] = '${APPWRITE_PROJECT_ID}'
    window['env']['APPWRITE_ENDPOINT'] = '${APPWRITE_ENDPOINT}'
    window['env']['APPWRITE_WEBSITE_URL'] = '${APPWRITE_WEBSITE_URL}'
    window['env']['APPWRITE_RUNS_COLLECTION_ID'] = '${APPWRITE_RUNS_COLLECTION_ID}'
})(this)
