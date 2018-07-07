/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import 'vs/css!./media/toolbarpart';
import * as nls from 'vs/nls';
import { TPromise } from 'vs/base/common/winjs.base';
import { Builder, $ } from 'vs/base/browser/builder';
import { Part } from 'vs/workbench/browser/part';
import { getZoomFactor } from 'vs/base/browser/browser';
import { IContextMenuService } from 'vs/platform/contextview/browser/contextView';
import { Action } from 'vs/base/common/actions';
import { IConfigurationService, IConfigurationChangeEvent } from 'vs/platform/configuration/common/configuration';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IDisposable, dispose } from 'vs/base/common/lifecycle';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { TOOLBAR_ACTIVE_BACKGROUND, TOOLBAR_ACTIVE_FOREGROUND, TOOLBAR_INACTIVE_FOREGROUND, TOOLBAR_INACTIVE_BACKGROUND, TOOLBAR_BORDER } from 'vs/workbench/common/theme';
import { addClass, addDisposableListener, EventType, EventHelper, Dimension } from 'vs/base/browser/dom';
import { IToolbarService, IToolbarEntry } from 'vs/platform/toolbar/common/toolbar';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IToolbarItem, IToolbarRegistry, ToolbarExtensions } from 'vs/workbench/browser/parts/toolbar/toolbar';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { Color } from 'vs/base/common/color';
import { isThemeColor } from 'vs/editor/common/editorCommon';
import { toErrorMessage } from 'vs/base/common/errorMessage';
import { Registry } from 'vs/platform/registry/common/platform';

export class ToolbarPart extends Part implements IToolbarService {
	public _serviceBrand: any;

	/*
	private static readonly NLS_UNSUPPORTED = nls.localize('patchedWindowTool', "[Unsupported]");
	private static readonly NLS_USER_IS_ADMIN = isWindows ? nls.localize('userIsAdmin', "[Administrator]") : nls.localize('userIsSudo', "[Superuser]");
	private static readonly NLS_EXTENSION_HOST = nls.localize('devExtensionWindowToolPrefix', "[Extension Development Host]");
	private static readonly TITLE_DIRTY = '\u25cf ';
	private static readonly TITLE_SEPARATOR = isMacintosh ? ' — ' : ' - '; // macOS uses special - separator
	*/

	private toolContainer: Builder;
	private dragArea: Builder;
	private initialToolFontSize: number;

	private isInactive: boolean;
	private activeEditorListeners: IDisposable[];


	private static readonly PRIORITY_PROP = 'priority';

	constructor(
		id: string,
		@IInstantiationService private instantiationService: IInstantiationService,
		//@IContextMenuService private contextMenuService: IContextMenuService,
		//@IWindowService private windowService: IWindowService,
		@IConfigurationService private configurationService: IConfigurationService,
		@IEditorService private editorService: IEditorService,
		//@IEnvironmentService private environmentService: IEnvironmentService,
		@IWorkspaceContextService private contextService: IWorkspaceContextService,
		@IThemeService themeService: IThemeService
	) {
		super(id, { hasTitle: false }, themeService);

		this.activeEditorListeners = [];

		this.registerListeners();
	}

	private registerListeners(): void {

		this._toDispose.push(addDisposableListener(window, EventType.BLUR, () => this.onBlur()));
		this._toDispose.push(addDisposableListener(window, EventType.FOCUS, () => this.onFocus()));
		this._toDispose.push(this.configurationService.onDidChangeConfiguration(e => this.onConfigurationChanged(e)));
		this._toDispose.push(this.editorService.onDidActiveEditorChange(() => this.onActiveEditorChange()));
		this._toDispose.push(this.contextService.onDidChangeWorkspaceFolders(() => this.onActiveEditorChange()));
		this._toDispose.push(this.contextService.onDidChangeWorkbenchState(() => this.onActiveEditorChange()));
		this._toDispose.push(this.contextService.onDidChangeWorkspaceName(() => this.onActiveEditorChange()));

	}

	private onBlur(): void {
		this.isInactive = true;
		this.updateStyles();
	}

	private onFocus(): void {
		this.isInactive = false;
		this.updateStyles();
	}

	private onConfigurationChanged(event: IConfigurationChangeEvent): void {
		if (event.affectsConfiguration('window.tool')) {

		}
	}

	private onActiveEditorChange(): void {

		// Dispose old listeners
		dispose(this.activeEditorListeners);
		this.activeEditorListeners = [];

		// Calculate New Window Toolbar items

		// Apply listener for dirty and label changes

	}

	public createContentArea(parent: HTMLElement): HTMLElement {
		this.toolContainer = $(parent);
		addClass(parent, 'monaco-action-bar');

		this.dragArea = $().div().addClass('drag-area');
		this.toolContainer.append(this.dragArea);

		// We do not want to steal focus from the
		// currently active element. So we restore focus after a timeout back to where it was.
		this.toolContainer.on([EventType.MOUSE_DOWN], () => {
			const active = document.activeElement;
			setTimeout(() => {
				if (active instanceof HTMLElement) {
					active.focus();
				}
			}, 0 /* need a timeout because we are in capture phase */);
		}, void 0, true /* use capture to know the currently active element properly */);

		// Fill in initial items that were contributed from the registry
		const registry = Registry.as<IToolbarRegistry>(ToolbarExtensions.Toolbar);

		const descriptors = registry.items;//.sort((a, b) => b.priority - a.priority); // right first because they float

		this._toDispose.push(...descriptors.map(descriptor => {
			const item = this.instantiationService.createInstance(descriptor.syncDescriptor);
			const el = this.doCreateToolbarItem(descriptor.priority);

			const dispose = item.render(el);
			this.toolContainer.append(el);

			return dispose;
		}));


		return this.toolContainer.getHTMLElement();
	}

	protected updateStyles(): void {
		super.updateStyles();

		// Part container
		if (this.toolContainer) {
			this.toolContainer.style('color', this.getColor(this.isInactive ? TOOLBAR_INACTIVE_FOREGROUND : TOOLBAR_ACTIVE_FOREGROUND));
			this.toolContainer.style('background-color', this.getColor(this.isInactive ? TOOLBAR_INACTIVE_BACKGROUND : TOOLBAR_ACTIVE_BACKGROUND));

			const toolBorder = this.getColor(TOOLBAR_BORDER);
			this.toolContainer.style('border-bottom', toolBorder ? `1px solid ${toolBorder}` : null);
		}
	}
	/*
		private onContextMenu(e: MouseEvent): void {

			// Find target anchor
			const event = new StandardMouseEvent(e);
			const anchor = { x: event.posx, y: event.posy };

			// Show menu
			const actions = this.getContextMenuActions();
			if (actions.length) {
				this.contextMenuService.showContextMenu({
					getAnchor: () => anchor,
					getActions: () => TPromise.as(actions),
					onHide: () => actions.forEach(a => a.dispose())
				});
			}
		}

		private getContextMenuActions(): IAction[] {
			const actions: IAction[] = [];

			return actions;
		}
	*/
	public layout(dimension: Dimension): Dimension[] {

		// To prevent zooming we need to adjust the font size with the zoom factor
		if (typeof this.initialToolFontSize !== 'number') {
			this.initialToolFontSize = parseInt(this.toolContainer.getComputedStyle().fontSize, 10);
		}
		this.toolContainer.style({ fontSize: `${this.initialToolFontSize / getZoomFactor()}px` });

		return super.layout(dimension);
	}

	setToolMessage(message: string, autoDisposeAfter?: number, delayBy?: number): IDisposable {
		throw new Error('Method not implemented.');
	}

	private getEntries(): HTMLElement[] {
		const entries: HTMLElement[] = [];

		const container = this.toolContainer.getHTMLElement();
		const children = container.children;
		for (let i = 0; i < children.length; i++) {
			const childElement = <HTMLElement>children.item(i);
			//if ($(childElement).getProperty(ToolbarPart.ALIGNMENT_PROP) === alignment) {
			entries.push(childElement);
			//}
		}

		return entries;
	}

	public addEntry(entry: IToolbarEntry, priority: number = 0): IDisposable {

		// Render entry in status bar
		const el = this.doCreateToolbarItem(priority, entry.showBeak ? 'has-beak' : void 0);
		const item = this.instantiationService.createInstance(ToolbarEntryItem, entry);
		const toDispose = item.render(el);

		// Insert according to priority
		const container = this.toolContainer.getHTMLElement();
		const neighbours = this.getEntries();
		let inserted = false;
		for (let i = 0; i < neighbours.length; i++) {
			const neighbour = neighbours[i];
			const nPriority = $(neighbour).getProperty(ToolbarPart.PRIORITY_PROP);
			if (
				/* alignment === ToolbarAlignment.LEFT && */ nPriority < priority
			) {
				container.insertBefore(el, neighbour);
				inserted = true;
				break;
			}
		}

		if (!inserted) {
			container.appendChild(el);
		}

		return {
			dispose: () => {
				$(el).destroy();

				if (toDispose) {
					toDispose.dispose();
				}
			}
		};
	}

	private doCreateToolbarItem(priority: number = 0, extraClass?: string): HTMLElement {
		const el = document.createElement('a');
		addClass(el, 'toolbar-item');
		if (extraClass) {
			addClass(el, extraClass);
		}


		addClass(el, 'left');


		$(el).setProperty(ToolbarPart.PRIORITY_PROP, priority);

		return el;
	}

}

let manageExtensionAction: ManageExtensionAction;
class ToolbarEntryItem implements IToolbarItem {
	constructor(
		private entry: IToolbarEntry,
		@ICommandService private commandService: ICommandService,
		@IInstantiationService private instantiationService: IInstantiationService,
		@INotificationService private notificationService: INotificationService,
		@ITelemetryService private telemetryService: ITelemetryService,
		@IContextMenuService private contextMenuService: IContextMenuService,
		@IEditorService private editorService: IEditorService,
		@IThemeService private themeService: IThemeService
	) {
		this.entry = entry;

		if (!manageExtensionAction) {
			manageExtensionAction = this.instantiationService.createInstance(ManageExtensionAction);
		}
	}

	public render(el: HTMLElement): IDisposable {
		let toDispose: IDisposable[] = [];
		addClass(el, 'toolbar-entry');

		// Icon Container
		let iconContainer: HTMLElement = document.createElement('i');
		el.appendChild(iconContainer);

		if (this.entry.command) {
			$(el).on('click', () => this.executeCommand(this.entry.command, this.entry.arguments), toDispose);
		}

		// Tooltip
		if (this.entry.tooltip) {
			$(el).title(this.entry.tooltip);
		}

		// Color
		let color = this.entry.color;
		if (color) {
			if (isThemeColor(color)) {
				let colorId = color.id;
				color = (this.themeService.getTheme().getColor(colorId) || Color.transparent).toString();
				toDispose.push(this.themeService.onThemeChange(theme => {
					let colorValue = (this.themeService.getTheme().getColor(colorId) || Color.transparent).toString();
					$(el).color(colorValue);
				}));
			}
			$(el).color(color);
		}

		// Context Menu
		if (this.entry.extensionId) {
			$(el).on('contextmenu', e => {
				EventHelper.stop(e, true);

				this.contextMenuService.showContextMenu({
					getAnchor: () => el,
					getActionsContext: () => this.entry.extensionId,
					getActions: () => TPromise.as([manageExtensionAction])
				});
			}, toDispose);
		}


		return {
			dispose: () => {
				toDispose = dispose(toDispose);
			}
		};
	}

	private executeCommand(id: string, args?: any[]) {
		args = args || [];

		// Maintain old behaviour of always focusing the editor here
		const activeTextEditorWidget = this.editorService.activeTextEditorWidget;
		if (activeTextEditorWidget) {
			activeTextEditorWidget.focus();
		}

		/* __GDPR__
			"workbenchActionExecuted" : {
				"id" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
				"from": { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
			}
		*/
		this.telemetryService.publicLog('workbenchActionExecuted', { id, from: 'toolbar' });
		this.commandService.executeCommand(id, ...args).done(undefined, err => this.notificationService.error(toErrorMessage(err)));
	}
}


class ManageExtensionAction extends Action {

	constructor(
		@ICommandService private commandService: ICommandService
	) {
		super('toolbar.manage.extension', nls.localize('manageExtension', "Manage Extension"));
	}

	public run(extensionId: string): TPromise<any> {
		return this.commandService.executeCommand('_extensions.manage', extensionId);
	}
}