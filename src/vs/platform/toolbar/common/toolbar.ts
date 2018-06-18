/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IDisposable } from 'vs/base/common/lifecycle';
import { ThemeColor } from 'vs/platform/theme/common/themeService';

export const IToolbarService = createDecorator<IToolbarService>('toolbarService');

/**
 * A declarative way of describing a tool bar entry
 */
export interface IToolbarEntry {

	/**
	 * The icon to show for the entry.
	 */
	iconDark: string;
	/**
	 * The icon to show for the entry.
	 */
	iconLight: string;

	/**
	 * A tooltip text to show when you hover over the entry
	 */
	tooltip: string;

	/**
	 * An optional color to use for the entry
	 */
	color?: string | ThemeColor;

	/**
	 * An optional id of a command that is known to the workbench to execute on click
	 */
	command?: string;

	/**
	 * Optional arguments for the command.
	 */
	arguments?: any[];

	/**
	 * An optional extension ID if this entry is provided from an extension.
	 */
	extensionId?: string;

	/**
	 * Wether to show a break to the left of the tool bar entry.
	 */
	showBeak?: boolean;
	priority: number;
}

export interface IToolbarService {

	_serviceBrand: any;

	/**
	 * Adds an entry to the toolbar with the given alignment and priority. Use the returned IDisposable
	 * to remove the toolbar entry.
	 */
	addEntry(entry: IToolbarEntry, priority?: number): IDisposable;

	/**
	 * Prints something to the tool bar area with optional auto dispose and delay.
	 */
	setToolMessage(message: string, autoDisposeAfter?: number, delayBy?: number): IDisposable;
}