/* eslint no-underscore-dangle: 0 */
import angular from 'angualr';
import $ from 'jquery';

export default class OtrsPopupService {
  constructor($rootScope) {
    'ngInject';

    this.$rootScope = $rootScope;

    this._isLoaded = false;
    this._isOpen = false;

    const actions = [
      'minimize',
      'maximize',
      'restore',
      'close',
      'open',
    ];
    angular.forEach(actions, (action) => {
      this[action] = id => this.$rootScope.$broadcast(`otrs.popup.${action}`, id);
    });
  }

  init() {
    this.open();
    this._isLoaded = true;
    this._isOpen = true;
    this.$rootScope.$broadcast('otrs.popup.opened');
  }

  isLoaded() {
    return this._isLoaded;
  }

  isOpen() {
    return this._isOpen;
  }

  toggle() {
    if ($('[data-otrs-popup] .draggable').hasClass('close')) {
      this.open();
      this._isOpen = true;
      this.$rootScope.$broadcast('otrs.popup.opened');
    } else {
      this.close();
      this._isOpen = false;
      this.$rootScope.$broadcast('otrs.popup.closed');
    }
  }
}
