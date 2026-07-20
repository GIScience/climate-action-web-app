;(function (window) {
    window.env = window.env || {}

    window['env']['ENVIRONMENT_TYPE'] = '${ENVIRONMENT_TYPE}'
    window['env']['CLIMATE_ACTION_API_URL'] = '${CLIMATE_ACTION_API_URL}'
    window['env']['GEOCODE_URL'] = '${GEOCODE_URL}'
    window['env']['GEOCODE_API_KEY'] = '${GEOCODE_API_KEY}'
    window['env']['HEIGIT_MAPS_URL'] = '${HEIGIT_MAPS_URL}'
    window['env']['APPWRITE_PROJECT_ID'] = '${APPWRITE_PROJECT_ID}'
    window['env']['APPWRITE_ENDPOINT'] = '${APPWRITE_ENDPOINT}'
    window['env']['APPWRITE_WEBSITE_URL'] = '${APPWRITE_WEBSITE_URL}'
    window['env']['APPWRITE_RUNS_COLLECTION_ID'] = '${APPWRITE_RUNS_COLLECTION_ID}'
    window['env']['CACHET_URL'] = '${CACHET_URL}'
    window['env']['CACHET_WATCHED_COMPONENTS'] = '${CACHET_WATCHED_COMPONENTS}'
    window['env']['SCHEDULE_LOOKAHEAD_DAYS'] = '${SCHEDULE_LOOKAHEAD_DAYS}'
    window['env']['FALLBACK_SCHEDULES_URL'] = '${FALLBACK_SCHEDULES_URL}'
})(this)
