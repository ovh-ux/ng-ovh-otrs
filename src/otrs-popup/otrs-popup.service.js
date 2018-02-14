angular.module("ovh-angular-otrs")
    .service("OtrsPopupService", function ($rootScope, $compile) {
        "use strict";

        var self = this;
        var actions = ["minimize", "maximize", "restore", "close"];
        var isLoaded = false;

        angular.forEach(actions, function (action) {
            self[action] = function (id) {
                $rootScope.$broadcast("otrs.popup." + action, id);
            };
        });

        this.toggle = function () {
            if ($("[otrs-popup] .draggable").hasClass("close")) {
                self.restore();
            } else {
                self.close();
            }
        };

        this.init = function () {
            $compile("<div otrs-popup></div>")($rootScope, function (el) {
                $("body").append(el);
                isLoaded = true;
            });
        };

        this.isLoaded = function () {
            return isLoaded;
        };

        /**
         * Changes the content of the ticket
         * @param {object} ticket The ticket
         * @param {object} ticket.body The ticket body content
         * @param {object} ticket.subject The subject of the ticket
         */
        this.changeTicket = function (ticket) {
            $rootScope.$broadcast("ticket.otrs.changeTicket", ticket);
        };
    });
