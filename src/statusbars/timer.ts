
/* IMPORT */

import * as moment from 'moment';
import * as vscode from 'vscode';
import Config from '../config';
import Consts from '../consts';
import Document from '../todo/document';
import Utils from '../utils';

/* TIMER */

class Timer {

  item; itemProps; config; data; intervalId;

  constructor () {

    this.item = this._initItem ();
    this.itemProps = {};
    this.data = {};

  }

  _initItem () {

    const alignment = Config.getKey ( 'timer.statusbar.alignment' ) === 'right' ? vscode.StatusBarAlignment.Right : vscode.StatusBarAlignment.Left,
          priority = Config.getKey ( 'timer.statusbar.priority' );

    return vscode.window.createStatusBarItem ( alignment, priority );

  }

  _setItemProp ( prop, value, _set = true ) {

    if ( this.itemProps[prop] === value ) return false;

    this.itemProps[prop] = value;

    if ( _set ) {

      this.item[prop] = value;

    }

    return true;

  }

  update ( doc: Document ) {

    this.config = Config.get ();

    const updated = this.updateData ( doc );

    if ( !updated ) return;

    this.updateVisibility ();
    this.updateTimer ();

    if ( !this.itemProps.visibility ) return;

    this.updateColor ();
    this.updateCommand ();
    this.updateTooltip ();
    this.updateText ();

  }

  updateData ( doc: Document ) {

    const todo = doc.getTodosBoxStarted ()[0];

    if ( !todo ) {

      if ( !this.data.line ) return false;

      this.data = {};

    } else {

      if ( this.data.text === todo.text ) return false;

      const startedTag = todo['getTag']( Consts.regexes.tagStarted ), //TSC
            startedFormat = this.config.timekeeping.started.format,
            startedMoment = moment ( startedTag, startedFormat ),
            startedDate = new Date ( startedMoment.valueOf () );

      if ( this.data.line && this.data.line.lineNumber === todo.line.lineNumber && this.data.startedDate.getTime () === startedDate.getTime () ) { // Support for editing the todo without resetting the timer

        this.data.text = todo.text;

        this.updateTooltip ();

        return false;

      }

      this.data = {
        line: todo.line,
        text: todo.text,
        startedDate,
        timerDate: new Date ()
      };

      const estTag = todo['getTag']( Consts.regexes.tagEstimate ); //TSC

      if ( estTag ) {

        const estSeconds = Utils.statistics.estimate.parse ( estTag );

        if ( estSeconds ) {

          this.data.estDate = new Date ( this.data.startedDate.getTime () + ( estSeconds * 1000 ) );

        }

      }

    }

    return true;

  }

  updateColor () {

    const {color} = this.config.timer.statusbar;

    this._setItemProp ( 'color', color );

  }

  updateCommand () {

    const {command} = this.config.timer.statusbar;

    this._setItemProp ( 'command', command );

  }

  updateTooltip () {

    this._setItemProp ( 'tooltip', this.data.text );

  }

  updateText () {

    const fromDate = this.data.estDate ? new Date ( this.data.startedDate.getTime () + ( Date.now () - this.data.timerDate.getTime () ) ) : this.data.timerDate,
          toDate = this.data.estDate ? this.data.estDate : new Date (),
          clock = Utils.time.diffClock ( toDate, fromDate );

    this._setItemProp ( 'text', clock );

  }

  updateVisibility () {

    const condition = this.config.timer.statusbar.enabled,
          visibility = this.data.text && ( condition === true || ( condition === 'estimate' && this.data.estDate ) );

    if ( this._setItemProp ( 'visibility', visibility ) ) {

      this.item[visibility ? 'show' : 'hide']();

    }

  }

  updateTimer () {

    if ( this.intervalId ) clearInterval ( this.intervalId );

    if ( !this.itemProps.visibility ) return;

    this.intervalId = setInterval ( this.updateText.bind ( this ), 1000 );

  }

}

/* EXPORT */

export default new Timer ();
