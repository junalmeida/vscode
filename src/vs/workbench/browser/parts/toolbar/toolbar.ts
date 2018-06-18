/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { Registry } from 'vs/platform/registry/common/platform';
import { IDisposable } from 'vs/base/common/lifecycle';
import { createSyncDescriptor, SyncDescriptor0 } from 'vs/platform/instantiation/common/descriptors';
import { IConstructorSignature4 } from 'vs/platform/instantiation/common/instantiation';

export interface IToolbarItem {
	render(element: HTMLElement): IDisposable;
}

export class ToolbarItemDescriptor {

	public syncDescriptor: SyncDescriptor0<IToolbarItem>;
	public priority: number;

	constructor(ctor: IConstructorSignature4<string, string, string, boolean, IToolbarItem>,
		command: string, iconName: string, title: string, priority?: number, separator?: boolean) {
		this.syncDescriptor = createSyncDescriptor(ctor,
			command, iconName, title, separator);
		this.priority = priority;
	}
}

export interface IToolbarRegistry {
	registerToolbarItem(descriptor: ToolbarItemDescriptor): void;
	items: ToolbarItemDescriptor[];
}

class ToolbarRegistry implements IToolbarRegistry {

	private _items: ToolbarItemDescriptor[];

	constructor() {
		this._items = [];
	}

	public get items(): ToolbarItemDescriptor[] {
		return this._items;
	}

	public registerToolbarItem(descriptor: ToolbarItemDescriptor): void {
		this._items.push(descriptor);
	}
}

export const ToolbarExtensions = {
	Toolbar: 'workbench.contributions.toolbar'
};

Registry.add(ToolbarExtensions.Toolbar, new ToolbarRegistry());
