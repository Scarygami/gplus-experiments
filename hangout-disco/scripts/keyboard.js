/*
 * Copyright (c) 2011 Björn Brauer
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License. You may obtain
 * a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

/**
 * Keyboard handler
 * Usage: call kbd.pressed(identifier) where identifier is a string containing all keys to query concatenated by '+' character.
 * For example kbd.pressed('space') kbd.pressed('strg+a') or kbd.pressed('ctrl+alt+c') returns true if all the queried keys are currently pressed.
 * There are a few aliases, (like left, space, up, down) so you could use them instead of writing the keycode.
 * For characters there is no need to provide the keyCode because internally any character will be transformed to it's equivalent keyCode.
 * To add an alias call kbd.addAlias(type, alias, key) where type is either 'keys' or 'modifiers' and
 * alias should be the alias you want to use for that key and key is either the keyCode or keyIdentifier
 */
function Keyboard_handler(element) {
  'use strict';
  var identifiers = {},
    keys = {},
    aliases = {
      keys: {
        LEFT: 37,
        UP: 38,
        RIGHT: 39,
        DOWN: 40,
        SPACE: 32
      },
      modifiers: {
        SHIFT: 'Shift',
        CTRL: 'Control',
        ALT: 'Alt'
      }
    };

  function onKeyDown(e) {
    identifiers[e.keyIdentifier] = true;
    keys[e.keyCode] = true;
  }

  function onKeyUp(e) {
    delete identifiers[e.keyIdentifier];
    delete keys[e.keyCode];
  }

  function pressed(identifier) {
    identifier = identifier.toUpperCase();
    return (identifier.split('+') || [identifier]).every(function (key) {
      return !!identifiers[aliases.modifiers[key]] || !!keys[aliases.keys[key]] || (key.length === 1 && !!keys[key.charCodeAt(0)]);
    });
  }

  function addAlias(type, alias, key) {
    alias = alias.toUpperCase();
    aliases[type][alias] = key;
  }

  function removeAlias(type, alias) {
    alias = alias.toUpperCase();
    delete aliases[type][alias];
  }

  function destroy() {
    element.removeEventListener('keydown', onKeyDown, false);
    element.removeEventListener('keyup', onKeyUp, false);
  }

  element.addEventListener('keydown', onKeyDown, false);
  element.addEventListener('keyup', onKeyUp, false);

  return {
    pressed: pressed,
    addAlias: addAlias,
    removeAlias: removeAlias,
    destroy: destroy
  };
}