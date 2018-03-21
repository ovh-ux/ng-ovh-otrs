angular.module("ovh-angular-otrs").controller("OtrsPopupCtrl", function ($q, $rootScope, $scope, $stateParams, $transitions, $translate,
                                                                         OvhApiMe, OvhApiMeVipStatus, OvhApiProductsAapi, OvhApiSupport,
                                                                         Alerter, constants, featureAvailability, OtrsPopupService, OtrsPopupInterventionService,
                                                                         OTRS_POPUP_ASSISTANCE_ENUM, OTRS_POPUP_BILLING_ENUM, OTRS_POPUP_CATEGORIES, OTRS_POPUP_INCIDENT_ENUM, OTRS_POPUP_INTERVENTION_ENUM, OTRS_POPUP_SERVICES, OTRS_POPUP_UNIVERSES,
                                                                         TICKET_CATEGORIES, UNIVERSE) {
    "use strict";

    var self = this;
    var OTHER_SERVICE = "other";

    self.loaders = {
        send: false,
        services: false,
        models: false,
        intervention: false
    };
    self.currentUser = null;
    self.isVIP = false;
    self.services = [];

    $transitions.onSuccess({}, function (transition) {
        var toParams = transition.params();
        if (toParams.projectId && self.services && self.services.indexOf(toParams.projectId) !== -1) {
            self.ticket.serviceName = toParams.projectId;
        }
    });

    function initFields () {
        self.ticket = {
            body: null,
            serviceName: null,
            subject: null,
            type: null
        };

        self.universes = _.get(OTRS_POPUP_UNIVERSES, $rootScope.target, OTRS_POPUP_UNIVERSES.EU);

        var standardizedUniverse = UNIVERSE === "GAMMA" ? "SUNRISE" : UNIVERSE;

        self.selectedUniverse = _.includes(["CLOUD", "DEDICATED"], standardizedUniverse) || !standardizedUniverse ? "CLOUD_DEDICATED" : standardizedUniverse;

        self.intervention = {
            serviceName: null,
            request: "intervention",
            disk: {
                comment: null,
                disks: [{
                    id: 1
                }],
                inverse: false
            },
            guides: {},
            hasMegaRaid: false,
            slotInfo: {},
            enums: {
                slotID: []
            }
        };
    }

    function manageAlert (message, type) {
        if (!message) {
            self.alert.visible = false;
            return;
        }

        self.alert.visible = true;
        self.alert.message = message;
        self.alert.type = type;
    }

    self.getServices = function () {
        self.loaders.services = true;

        // hide alert
        manageAlert();
        return OvhApiProductsAapi
            .get({
                includeInactives: true,
                universe: self.selectedUniverse === "CLOUD_DEDICATED" ? "DEDICATED" : self.selectedUniverse
            }).$promise.then(function (services) {
                var translationPromises = services.results.map(function (s) {
                    return $translate("otrs_service_category_" + s.name, null, null, s.name).then(function (value) {
                        s.translatedName = value;
                        return s;
                    });
                });

                return $q.all(translationPromises).then(function (services) { // eslint-disable-line no-shadow
                    services = services.sort(function (a, b) { return a.translatedName.localeCompare(b.translatedName); }); // eslint-disable-line no-param-reassign
                    services.push({
                        translatedName: $translate.instant("otrs_service_category_other"),
                        services: [
                            {
                                serviceName: OTHER_SERVICE,
                                displayName: $translate.instant("otrs_service_category_other")
                            }
                        ]
                    });
                    self.services = services;

                    return services;
                });
            })
            .catch(function (err) {
                manageAlert([($translate.instant("otrs_err_get_infos"), err.data && err.data.message) || ""].join(" "), "danger");
            })
            .finally(function () {
                self.loaders.services = false;
            });
    };

    /**
     * Send ticket.
     * @return {Promise}
     */
    self.sendTicket = function () {
        // hide alert
        manageAlert();

        if (!self.loaders.send && self.ticket.body) {
            self.loaders.send = true;

            if (self.ticket.serviceName === OTHER_SERVICE) {
                self.ticket.serviceName = "";
                self.ticket.category = TICKET_CATEGORIES.DEFAULT;
            }

            return OvhApiSupport.Lexi()
                .create(self.ticket).$promise
                .then(function (data) {
                    initFields();
                    self.otrsPopupForm.$setUntouched();
                    self.otrsPopupForm.$setPristine();
                    $rootScope.$broadcast("ticket.otrs.reload");
                    manageAlert($translate.instant("otrs_popup_sent_success", {
                        ticketNumber: data.ticketNumber,
                        ticketId: data.ticketId
                    }), "success");
                })
                .catch(function (err) {
                    manageAlert([($translate.instant("otrs_popup_sent_error"), err.data && err.data.message) || ""].join(" "), "danger");
                })
                .finally(function () {
                    self.loaders.send = false;
                });
        }

        return $q.when();
    };

    /**
     * Send disk replacement.
     * @return {Promise}
     */
    self.sendDiskReplacement = function () {
        if (!self.loaders.send) {
            self.loaders.send = true;

            return OtrsPopupInterventionService
                .sendDiskReplacement(self.intervention.serviceName, self.intervention.disk)
                .then(function (data) {
                    initFields();
                    $rootScope.$broadcast("ticket.otrs.reload");
                    manageAlert($translate.instant("otrs_popup_sent_success", {
                        ticketNumber: data.ticketNumber,
                        ticketId: data.ticketId
                    }), "success");
                }).catch(function (err) {
                    if (_.includes(err.message, "This feature is currently not supported in your datacenter")) {
                        manageAlert($translate.instant("otrs_popup_sent_error_not_available"), "danger");
                    } else if (_.includes(err.message, "Action pending : ticketId ")) {
                        var ticketId = /\d+$/.exec(err.message);
                        manageAlert($translate.instant("otrs_popup_sent_error_already_exists", {
                            ticketId: ticketId
                        }), "danger");
                    } else {
                        manageAlert([$translate.instant("otrs_popup_sent_error"), _.get(err, "message", "")].join(" "), "danger");
                    }
                }).finally(function () {
                    self.loaders.send = false;
                    self.refreshFAQ();
                    self.refreshRequests();
                    self.setForm("start");
                });
        }

        return $q.when();
    };

    function getSelectedService () {
        return _.filter(self.services, function (service) {
            return _.find(service.services, { serviceName: self.ticket.serviceName });
        });
    }

    function isSelectedChoiceDedicatedServer () {
        return _.first(_.map(getSelectedService(), "name")) === "SERVER";
    }

    self.refreshFAQ = function () {
        self.faq = {};

        var serviceCategory = "";

        if (self.services.choice) {
            serviceCategory = self.services.choice.category;
        }

        if (self.ticket.serviceName) {
            serviceCategory = _.first(_.map(getSelectedService(), "name"));
        }

        switch (serviceCategory) {
        case self.servicesValues.DOMAIN:
        case self.servicesValues.HOSTING:
        case self.servicesValues.EMAIL:
        case self.servicesValues.ZONE:
        case self.servicesValues.SQL:
            self.faq.url = constants.urls.FAQS.WEB.URL[self.currentUser.ovhSubsidiary];
            self.faq.title = constants.urls.FAQS.WEB.TITLE;
            break;
        case self.servicesValues.EXCHANGE:
            self.faq.url = constants.urls.FAQS.EXCHANGE.URL[self.currentUser.ovhSubsidiary];
            self.faq.title = constants.urls.FAQS.EXCHANGE.TITLE;
            break;
        case self.servicesValues.OFFICE_365:
            self.faq.url = constants.urls.FAQS.OFFICE_365.URL[self.currentUser.ovhSubsidiary];
            self.faq.title = constants.urls.FAQS.OFFICE_365.TITLE;
            break;
        case self.servicesValues.DEDICATED:
        case "SERVER":
            self.faq.url = constants.urls[self.currentUser.ovhSubsidiary].faq;
            self.faq.title = "otrs_popup_service_faq_sd";
            break;
        case self.servicesValues.VPS:
            self.faq.url = constants.urls[self.currentUser.ovhSubsidiary].faqVps;
            self.faq.title = "otrs_popup_service_faq_vps";
            break;
        default:
            break;
        }

        return self.faq;
    };

    self.refreshRequests = function () {
        if (featureAvailability.allowDedicatedServerHardwareReplacement() && isSelectedChoiceDedicatedServer() &&
            !_.includes(self.requests, self.intervention.request)) {
            self.requests.push(self.intervention.request);
        } else if (!isSelectedChoiceDedicatedServer()) {
            _.remove(self.requests, function (req) {
                return self.intervention.request === req;
            });
            self.ticket.category = undefined;
            self.ticket.subcategory = null;
        }
    };

    self.refreshFormDetails = function () {
        if (self.ticket.subcategory === OTRS_POPUP_INTERVENTION_ENUM.REPLACEMENTDISK && self.formDetails === "message") {
            self.refreshRequests();
            self.setForm("start");
        }
    };

    function getServerInfo () {
        self.loaders.intervention = true;
        self.intervention.canHotSwap = false;
        self.intervention.hasMegaRaid = false;
        self.intervention.slotInfo.canUseSlotId = null;
        self.intervention.slotInfo.slotsCount = 0;
        return OtrsPopupInterventionService
            .getServerInterventionInfo(self.intervention.serviceName)
            .then(function (serverInfo) {
                self.intervention.canHotSwap = serverInfo.canHotSwap;
                self.intervention.hasMegaRaid = serverInfo.hasMegaRaid;
                self.intervention.slotInfo = serverInfo.slotInfo;
                if (self.intervention.slotInfo.canUseSlotId) {
                    self.intervention.enums.slotID = Array.apply(null, { length: self.intervention.slotInfo.slotsCount }).map(Number.call, Number);
                }
            }).catch(function () {
                manageAlert($translate.instant("otrs_intervention_disk_error"), "danger");
            }).finally(function () {
                self.loaders.intervention = false;
            });
    }

    self.addDisk = function () {
        var newItemNo = self.intervention.disk.disks.length + 1;
        self.intervention.disk.disks.push({ id: newItemNo });
    };

    self.removeChoice = function (item) {
        self.intervention.disk.disks.splice(item, 1);
    };

    self.productHasFaq = function () {
        return self.faq && self.faq.url && self.currentUser.ovhSubsidiary !== "US";
    };

    self.setForm = function (formDetails) {
        self.formDetails = formDetails;
    };

    self.continueForm = function () {
        if (self.ticket && self.ticket.category === OTRS_POPUP_CATEGORIES.INTERVENTION && self.ticket.subcategory === OTRS_POPUP_INTERVENTION_ENUM.REPLACEMENTDISK) {
            self.intervention.serviceName = self.ticket.serviceName;
            self.setForm(OTRS_POPUP_INTERVENTION_ENUM.REPLACEMENTDISK);
        } else if (self.ticket && self.ticket.category === OTRS_POPUP_CATEGORIES.INTERVENTION && self.ticket.subcategory === OTRS_POPUP_INTERVENTION_ENUM.OTHER) {
            self.ticket.category = OTRS_POPUP_CATEGORIES.INCIDENT;
            self.ticket.subcategory = OTRS_POPUP_INCIDENT_ENUM.DOWN;
            self.setForm("message");
        } else {
            self.setForm("message");
        }
    };

    $scope.$watch("OtrsPopupCtrl.intervention.serviceName", function (server, oldServer) {
        if (server && server !== oldServer) {
            self.services.choice = self.intervention.serviceName;
            getServerInfo();
        }
    });

    $scope.$watch("OtrsPopupCtrl.ticket.serviceName", function () {
        self.refreshFAQ();
        self.refreshFormDetails();
        self.refreshRequests();
    });

    $scope.$watch("OtrsPopupCtrl.ticket.subcategory", function () {
        self.refreshFormDetails();
    });

    this.$onInit = function () {

        initFields();

        self.alert = {
            visible: false,
            type: null,
            message: null
        };

        self.faq = null;
        self.servicesValues = OTRS_POPUP_SERVICES;
        self.formDetails = "start";
        self.interventionEnum = OTRS_POPUP_INTERVENTION_ENUM;

        // hide alert
        manageAlert();

        $q.all({
            services: self.getServices(),
            me: OvhApiMe.Lexi().get().$promise,
            meVipStatus: OvhApiMeVipStatus.Lexi().get().$promise,
            supportSchema: OvhApiSupport.Lexi().schema().$promise
        }).then(function (results) {
            self.currentUser = results.me;

            self.isVIP = _.values(results.meVipStatus.toJSON()).indexOf(true) !== -1;

            self.types = results.supportSchema.models["support.TicketTypeEnum"].enum;
            self.categories = results.supportSchema.models["support.TicketProductEnum"].enum;
            self.requests = results.supportSchema.models["support.TicketCategoryEnum"].enum;

            self.subCategories = {
                assistance: [
                    OTRS_POPUP_ASSISTANCE_ENUM.USAGE,
                    OTRS_POPUP_ASSISTANCE_ENUM.START
                ],
                billing: [
                    OTRS_POPUP_BILLING_ENUM.INPROGRESS,
                    OTRS_POPUP_BILLING_ENUM.BILL
                ],
                incident: [
                    OTRS_POPUP_INCIDENT_ENUM.PERFS,
                    OTRS_POPUP_INCIDENT_ENUM.ALERTS,
                    OTRS_POPUP_INCIDENT_ENUM.DOWN
                ],
                intervention: [
                    OTRS_POPUP_INTERVENTION_ENUM.REPLACEMENTDISK
                ]
            };

            if (self.currentUser.ovhSubsidiary !== "FR") {
                self.subCategories.assistance.splice(2, 0, OTRS_POPUP_ASSISTANCE_ENUM.NEW);
                self.subCategories.assistance.splice(3, 0, OTRS_POPUP_ASSISTANCE_ENUM.OTHER);
                self.subCategories.billing.splice(1, 0, OTRS_POPUP_ASSISTANCE_ENUM.NEW);
                self.subCategories.billing.splice(3, 0, OTRS_POPUP_ASSISTANCE_ENUM.OTHER);
                self.subCategories.incident.splice(3, 0, OTRS_POPUP_ASSISTANCE_ENUM.OTHER);
            }

            if (self.categories.length === 1) {
                self.ticket.product = self.categories[0];
            }

            if (self.currentUser && _.has(constants.urls, [self.currentUser.ovhSubsidiary, "guides"])) {
                self.intervention.guides = {
                    diskSerial: constants.urls[self.currentUser.ovhSubsidiary].guides.diskSerial || constants.urls.FR.guides.diskSerial,
                    noMegaRaidLED: constants.urls[self.currentUser.ovhSubsidiary].guides.noMegaRaidLED || constants.urls.FR.guides.noMegaRaidLED,
                    megaRaidLED: constants.urls[self.currentUser.ovhSubsidiary].guides.megaRaidLED || constants.urls.FR.guides.megaRaidLED
                };
            }
        })
            .catch(function (err) { manageAlert([($translate.instant("otrs_err_get_infos"), err.data && err.data.message) || ""].join(" "), "danger"); })
            .finally(function () { self.loaders.models = false; });
    };
});
