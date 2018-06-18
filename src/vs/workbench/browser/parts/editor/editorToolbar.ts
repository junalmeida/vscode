/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { IToolbarItem } from 'vs/workbench/browser/parts/toolbar/toolbar';
import { Themable } from 'vs/workbench/common/theme';
import { IDisposable, dispose } from 'vs/base/common/lifecycle';
import { $ } from 'vs/base/browser/builder';
import { EventHelper, addClass } from 'vs/base/browser/dom';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { OcticonLabel } from 'vs/base/browser/ui/octiconLabel/octiconLabel';
import * as nls from 'vs/nls';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { toErrorMessage } from 'vs/base/common/errorMessage';

// declare all buttons related to editors on editor.contribution.ts

export class FileNewButton extends Themable implements IToolbarItem {
	private container: HTMLElement;
	icon: OcticonLabel;
	readonly command = 'workbench.action.files.newUntitledFile';

	constructor(
		@INotificationService private notificationService: INotificationService,
		@ICommandService private commandService: ICommandService,
		@ITelemetryService private telemetryService: ITelemetryService,
		@IThemeService themeService: IThemeService,
		@IEditorService private editorService: IEditorService,
	) {
		super(themeService);
	}

	public render(element: HTMLElement): IDisposable {
		let callOnDispose: IDisposable[] = [];
		this.container = element;

		addClass(this.container, 'break');

		this.icon = new OcticonLabel(element);
		this.icon.text = '$(file-text)';
		this.icon.title = nls.localize('newFile', "New File");

		// Prevent showing dropdown on anything but left click
		$(this.container).on('mousedown', (e: MouseEvent) => {
			if (e.button !== 0) {
				EventHelper.stop(e, true);
			}
			this.executeCommand(this.command);
		}, this.toUnbind, true);

		return {
			dispose: () => {
				callOnDispose = dispose(callOnDispose);
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
		this.telemetryService.publicLog('workbenchActionExecuted', { id, from: 'status bar' });
		this.commandService.executeCommand(id, ...args).done(undefined, err => this.notificationService.error(toErrorMessage(err)));
	}
}