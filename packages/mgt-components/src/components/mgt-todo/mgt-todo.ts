/**
 * -------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation.  All Rights Reserved.  Licensed under the MIT License.
 * See License in the project root for license information.
 * -------------------------------------------------------------------------------------------
 */

import { html, TemplateResult } from 'lit';
import { state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { repeat } from 'lit/directives/repeat.js';
import { IGraph, customElement, mgtHtml } from '@microsoft/mgt-element';
import { Providers, ProviderState } from '@microsoft/mgt-element';
import { getDateString, getDateMap } from '../../utils/Utils';
import { getSvg, SvgIcon } from '../../utils/SvgHelper';
import '../mgt-person/mgt-person';
import { MgtTasksBase } from '../mgt-tasks-base/mgt-tasks-base';
import '../sub-components/mgt-arrow-options/mgt-arrow-options';
import '../sub-components/mgt-dot-options/mgt-dot-options';
import {
  createTodoTask,
  deleteTodoTask,
  getTodoTasks,
  TaskStatus,
  TodoTask,
  TodoTaskList,
  updateTodoTask
} from './graph.todo';
import { styles } from './mgt-todo-css';
import { strings } from './strings';
import { registerFluentComponents } from '../../utils/FluentComponents';
import { fluentRadio, fluentRadioGroup, fluentButton } from '@fluentui/web-components';

registerFluentComponents(fluentRadio, fluentRadioGroup, fluentButton);

/**
 * Filter function
 */
export type TodoFilter = (task: TodoTask) => boolean;

/**
 * component enables the user to view, add, remove, complete, or edit todo tasks. It works with tasks in Microsoft Planner or Microsoft To-Do.
 *
 * @export
 * @class MgtTodo
 * @extends {MgtTasksBase}
 *
 * @cssprop --tasks-background-color - {Color} Task background color
 * @cssprop --tasks-header-padding - {String} Tasks header padding
 * @cssprop --tasks-title-padding - {String} Tasks title padding
 * @cssprop --tasks-plan-title-font-size - {Length} Tasks plan title font size
 * @cssprop --tasks-plan-title-padding - {String} Tasks plan title padding
 * @cssprop --tasks-new-button-width - {String} Tasks new button width
 * @cssprop --tasks-new-button-height - {String} Tasks new button height
 * @cssprop --tasks-new-button-color - {Color} Tasks new button color
 * @cssprop --tasks-new-button-background - {String} Tasks new button background
 * @cssprop --tasks-new-button-border - {String} Tasks new button border
 * @cssprop --tasks-new-button-hover-background - {Color} Tasks new button hover background
 * @cssprop --tasks-new-button-active-background - {Color} Tasks new button active background
 * @cssprop --task-margin - {String} Task margin
 * @cssprop --task-background - {Color} Task background
 * @cssprop --task-border - {String} Task border
 * @cssprop --task-header-color - {Color} Task header color
 * @cssprop --task-header-margin - {String} Task header margin
 * @cssprop --task-new-margin - {String} Task new margin
 * @cssprop --task-new-border - {String} Task new border
 * @cssprop --task-new-input-margin - {String} Task new input margin
 * @cssprop --task-new-input-padding - {String} Task new input padding
 * @cssprop --task-new-input-font-size - {Length} Task new input font size
 * @cssprop --task-new-select-border - {String} Task new select border
 * @cssprop --task-new-add-button-background - {Color} Task new add button background
 * @cssprop --task-new-add-button-disabled-background - {Color} Task new add button disabled background
 * @cssprop --task-new-cancel-button-color - {Color} Task new cancel button color
 * @cssprop --task-complete-background - {Color} Task complete background
 * @cssprop --task-complete-border - {String} Task complete border
 * @cssprop --task-icon-alignment - {String} Task icon alignment
 * @cssprop --task-icon-background - {Color} Task icon color
 * @cssprop --task-icon-background-completed - {Color} Task icon background color when completed
 * @cssprop --task-icon-border - {String} Task icon border styles
 * @cssprop --task-icon-border-completed - {String} Task icon border style when task is completed
 * @cssprop --task-icon-border-radius - {String} Task icon border radius
 * @cssprop --task-icon-color - {Color} Task icon color
 * @cssprop --task-icon-color-completed - {Color} Task icon color when completed
 */
@customElement('todo')
// @customElement('mgt-todo')
export class MgtTodo extends MgtTasksBase {
  /**
   * Array of styles to apply to the element. The styles should be defined
   * using the `css` tag function.
   */
  public static get styles() {
    return styles;
  }
  protected get strings() {
    return strings;
  }

  /**
   * The name of a potential new task
   *
   * @readonly
   * @protected
   * @type {string}
   * @memberof MgtTasksBase
   */
  protected get newTaskName(): string {
    return this._newTaskName;
  }

  /**
   * Optional filter function when rendering tasks
   *
   * @type {TodoFilter}
   * @memberof MgtTodo
   */
  public taskFilter: TodoFilter;

  /**
   * Get the scopes required for todo
   *
   * @static
   * @return {*}  {string[]}
   * @memberof MgtTodo
   */
  public static get requiredScopes(): string[] {
    return ['tasks.read', 'tasks.readwrite'];
  }
  private _tasks: TodoTask[];

  private _isLoadingTasks: boolean;
  private _loadingTasks: string[];
  private _newTaskDueDate: string;
  private _newTaskName: string;
  private _isNewTaskBeingAdded: boolean;
  private _openCalendar: boolean;
  private _graph: IGraph;
  @state() private currentList: TodoTaskList;

  constructor() {
    super();
    this._graph = null;
    this._newTaskDueDate = null;
    this._tasks = [];
    this._loadingTasks = [];
    this._isLoadingTasks = false;
    this._openCalendar = false;
  }

  protected createRenderRoot() {
    const root = super.createRenderRoot();
    root.addEventListener('selectionChanged', (e: Event) => this.handleSelectionChanged(e));
    return root;
  }

  /**
   * Render the list of todo tasks
   */
  protected renderTasks(): TemplateResult {
    if (this._isLoadingTasks) {
      return this.renderLoadingTask();
    }

    let tasks = this._tasks;
    if (tasks && this.taskFilter) {
      tasks = tasks.filter(task => this.taskFilter(task));
    }

    const taskTemplates = repeat(
      tasks,
      task => task.id,
      task => this.renderTask(task)
    );
    return html`
      <fluent-radio-group orientation="vertical">
        ${taskTemplates}
      </fluent-radio-group>
    `;
  }

  /**
   * Toggle Calendar
   *
   * @protected
   * @memberof MgtTodo
   */
  protected toggleCalendar(state: boolean): void {
    this._openCalendar = state;
    this.requestUpdate();
  }

  /**
   * Render the generic picker.
   *
   */
  protected renderPicker() {
    return mgtHtml`
      <mgt-picker
        resource="me/todo/lists"
        scopes="tasks.read, tasks.readwrite"
        key-name="displayName"
        placeholder="Select a task list"
      ></mgt-picker>
        `;
  }

  /**
   * Create a new todo task and add it to the list
   *
   * @protected
   * @returns
   * @memberof MgtTodo
   */
  protected async addTask() {
    if (this._isNewTaskBeingAdded || !this.newTaskName) {
      return;
    }

    this._isNewTaskBeingAdded = true;
    this.requestUpdate();

    try {
      await this.createNewTask();
    } finally {
      this.clearNewTaskData();
      this._isNewTaskBeingAdded = false;
      this.requestUpdate();
    }
  }

  /**
   * Render the panel for creating a new task
   *
   * @protected
   * @returns {TemplateResult}
   * @memberof MgtTodo
   */
  protected renderNewTask(): TemplateResult {
    const addIcon = html`
      <span 
        tabindex='0'
        class="task-add-icon" 
        @click="${() => this.addTask()}"
        @keypress="${(e: KeyboardEvent) => {
          if (e.key === 'Enter') {
            this.addTask();
          }
        }}">
        ${getSvg(SvgIcon.Add)}
      </span>
    `;

    const cancelIcon = html`
      <span 
        tabindex='0'
        class="task-cancel-icon" 
        @click="${() => this.clearNewTaskData()}"
        @keypress="${(e: KeyboardEvent) => {
          if (e.key === 'Enter') {
            this.clearNewTaskData();
          }
        }}">
        ${getSvg(SvgIcon.Cancel)}
      </span>
    `;

    const calendarTemplate = html`
      ${getSvg(SvgIcon.Calendar)}
      <fluent-button appearance="stealth" 
        @click=${(e: Event) => this.toggleCalendar(true)}>
        ${this.strings.dueDate}
      </fluent-button>
    `;

    const taskTitle = html`
       <fluent-text-field
         appearance="outline"
         label="new-taskName-input"
         aria-label="new-taskName-input"
         .value=${this._newTaskName}
         placeholder="${this.strings.newTaskPlaceholder}"
         @keypress="${(e: KeyboardEvent) => {
           if (e.key === 'Enter') {
             this.addTask();
           }
         }}"
         @input="${(e: Event) => {
           this._newTaskName = (e.target as HTMLInputElement).value;
           this.requestUpdate();
         }}">
          <div slot="start">${addIcon}</div>
          <div slot="end">
          ${calendarTemplate}
          ${cancelIcon}</div>
        </fluent-text-field>
     `;
    return html`
      <div dir=${this.direction} class="Task NewTask Incomplete">
        ${taskTitle}
      </div>
        ${
          this._openCalendar
            ? html`
                <fluent-calendar readonly="false" locale="en-US"
                  selected-dates="${this._newTaskDueDate}"
                  @dateselected="${e => this.handleDateSelected(e)}"
                  @mouseleave=${() => this.toggleCalendar(false)}>
                </fluent-calendar>`
            : null
        }
     `;
  }
  // selected-dates="2-20-2023"
  protected async handleSelectionChanged(e: any) {
    let list = e.detail;
    this.currentList = list;
    await this.loadTasks(list);
  }

  private handleDateSelected(e: CustomEvent<{ day: number; month: number; year: number }>) {
    if (e) {
      this._newTaskDueDate = `${e.detail.month}-${e.detail.day}-${e.detail.year}`;
      this.requestUpdate();
    } else {
      this._newTaskDueDate = null;
    }
  }

  /**
   * Render a task in the list.
   *
   * @protected
   * @param {TodoTask} task
   * @returns
   * @memberof MgtTodo
   */
  protected renderTask(task: TodoTask) {
    const context = { task, list: this.currentList };

    if (this.hasTemplate('task')) {
      return this.renderTemplate('task', context, task.id);
    }

    const isCompleted = (TaskStatus as any)[task.status] === TaskStatus.completed;

    let taskDetailsTemplate = null;

    const taskDueTemplate = task.dueDateTime
      ? html`
          <fluent-button appearance="stealth" class="TaskDue">
            <span part="start" class="TaskDueCalendar">${getSvg(SvgIcon.Calendar)}</span>
            <span part="content" class="TaskDueDate">${getDateString(new Date(task.dueDateTime.dateTime))}</span>
        </fluent-button>
        `
      : null;

    if (this.hasTemplate('task-details')) {
      taskDetailsTemplate = this.renderTemplate('task-details', context, `task-details-${task.id}`);
    } else {
      taskDetailsTemplate = html`
      <div class="TaskDetails">
        <div class="title">${task.title}</div>
        <div class="TaskDue">${taskDueTemplate}</div>
        <div class="TaskDelete" @click="${(e: Event) => this.removeTask(e, task.id)}">
          ${getSvg(SvgIcon.Delete)}
        </div>
      </div>
      `;
    }

    const taskClasses = classMap({
      Complete: isCompleted,
      Incomplete: !isCompleted,
      ReadOnly: this.readOnly,
      Task: true
    });

    return html`
      <fluent-radio class=${taskClasses} @click="${(e: Event) => this.handleTaskCheckClick(e, task)}">
        ${taskDetailsTemplate}
      </fluent-radio>
    `;
  }

  /**
   * loads tasks from dataSource
   *
   * @returns
   * @memberof MgtTasks
   */
  protected async loadState(): Promise<void> {
    const provider = Providers.globalProvider;
    if (!provider || provider.state !== ProviderState.SignedIn) {
      return;
    }

    if (!this._graph) {
      const graph = provider.graph.forComponent(this);
      this._graph = graph;
    }

    let currentList = this.currentList;
    if (currentList) {
      await this.loadTasks(currentList);
    }
  }

  /**
   * Send a request the Graph to create a new todo task item
   *
   * @protected
   * @returns {Promise<any>}
   * @memberof MgtTodo
   */
  protected async createNewTask(): Promise<void> {
    const listId = this.currentList.id;
    const taskData = {
      title: this.newTaskName
    };
    console.log('date: ', this._newTaskDueDate);

    if (this._newTaskDueDate) {
      // tslint:disable-next-line: no-string-literal
      taskData['dueDateTime'] = {
        dateTime: new Date(this._newTaskDueDate).toLocaleDateString(),
        timeZone: 'UTC'
      };
    }

    const task = await createTodoTask(this._graph, listId, taskData);
    this._tasks.unshift(task);
  }

  /**
   * Clear out the new task metadata input fields
   *
   * @protected
   * @memberof MgtTodo
   */
  protected clearNewTaskData(): void {
    super.clearNewTaskData();
    this._newTaskDueDate = null;
    this._newTaskName = '';
  }

  /**
   * Clear the state of the component
   *
   * @protected
   * @memberof MgtTodo
   */
  protected clearState(): void {
    super.clearState();
    this.currentList = null;
    this._tasks = [];
    this._loadingTasks = [];
    this._isLoadingTasks = false;
  }

  private async loadTasks(list: TodoTaskList): Promise<void> {
    this._isLoadingTasks = true;
    this.currentList = list;
    this.requestUpdate();

    this._tasks = await getTodoTasks(this._graph, list.id);

    this._isLoadingTasks = false;
    this.requestUpdate();
  }

  private async updateTaskStatus(task: TodoTask, taskStatus: TaskStatus): Promise<void> {
    this._loadingTasks = [...this._loadingTasks, task.id];
    this.requestUpdate();

    // Change the task status
    task.status = taskStatus;

    // Send update request
    const listId = this.currentList.id;
    task = await updateTodoTask(this._graph, listId, task.id, task);

    const taskIndex = this._tasks.findIndex(t => t.id === task.id);
    this._tasks[taskIndex] = task;

    this._loadingTasks = this._loadingTasks.filter(id => id !== task.id);
    this.requestUpdate();
  }

  // tslint:disable-next-line: completed-docs
  private async removeTask(e: Event, taskId: string) {
    this._tasks = this._tasks.filter(t => t.id !== taskId);
    this.requestUpdate();

    const listId = this.currentList.id;
    await deleteTodoTask(this._graph, listId, taskId);

    this._tasks = this._tasks.filter(t => t.id !== taskId);
  }

  private handleTaskCheckClick(e: Event, task: TodoTask) {
    this.handleTaskClick(e, task);
    if (!this.readOnly) {
      if ((TaskStatus as any)[task.status] === TaskStatus.completed) {
        this.updateTaskStatus(task, TaskStatus.notStarted);
      } else {
        this.updateTaskStatus(task, TaskStatus.completed);
      }

      e.stopPropagation();
      e.preventDefault();
    }
  }
}
