angular.module("ovh-angular-otrs")
    .config(function ($stateProvider) {
        "use strict";
        $stateProvider.state("otrs-list", {
            url: "/support",
            controller: function ($window, MANAGER_URLS) {
                $window.open(MANAGER_URLS.dedicated + "ticket", "_self");
            }
        });
    });
