import angular from 'angular';
import 'ovh-api-services';
import 'ovh-jquery-ui-draggable-ng';
import translate from 'angular-translate';
// import asyncLoaderFactory from './async-loader.factory';

import {
  ASSISTANCE_ENUM,
  BILLING_ENUM,
  INCIDENT_ENUM,
  INTERVENTION_ENUM,
  CATEGORIES,
  SERVICES,
  UNIVERSES,
} from './otrs-popup/otrs-popup.constant';
import { TICKET_CATEGORIES } from './ticket-categories.constants';
import OtrsPopupCtrl from './otrs-popup/otrs-popup.controller';
import OtrsPopupDirective from './otrs-popup/otrs-popup.directive';
import OtrsPopupProvider from './otrs-popup/otrs-popup.provider';
import OtrsPopupService from './otrs-popup/otrs-popup.service';
import OtrsPopupInterventionService from './otrs-popup/intervention/otrs-popup-intervention.service';

import './otrs.less';

export default angular
  .module('ovh-angular-otrs', [
    'ovh-api-services',
    'ovh-jquery-ui-draggable-ng',
    translate,
  ])
  // .factory('asyncLoader', asyncLoaderFactory)
  // .run(($translate, asyncLoader) => {
  //   asyncLoader.addTranslations(
  // import(`./translations/Messages_${$translate.use()}.xml`).then(x => x.default));
  //   $translate.refresh();
  // })
  .constant('OTRS_POPUP_ASSISTANCE_ENUM', ASSISTANCE_ENUM)
  .constant('OTRS_POPUP_BILLING_ENUM', BILLING_ENUM)
  .constant('OTRS_POPUP_INCIDENT_ENUM', INCIDENT_ENUM)
  .constant('OTRS_POPUP_INTERVENTION_ENUM', INTERVENTION_ENUM)
  .constant('OTRS_POPUP_CATEGORIES', CATEGORIES)
  .constant('OTRS_POPUP_SERVICES', SERVICES)
  .constant('OTRS_POPUP_UNIVERSES', UNIVERSES)
  .constant('TICKET_CATEGORIES', TICKET_CATEGORIES)
  .controller('OtrsPopupCtrl', OtrsPopupCtrl)
  .directive('otrsPopup', OtrsPopupDirective)
  .provider('OtrsPopup', OtrsPopupProvider)
  .service('OtrsPopupService', OtrsPopupService)
  .service('OtrsPopupInterventionService', OtrsPopupInterventionService)
  .name;
