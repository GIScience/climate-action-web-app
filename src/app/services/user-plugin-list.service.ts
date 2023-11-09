import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {UserPlugin} from "../models/user-plugin.interface";

@Injectable({
  providedIn: 'root'
})
export class UserPluginListService {

  private pluginList: Array<UserPlugin> = []
  private pluginListSource = new BehaviorSubject<Array<UserPlugin>>([])
  pluginListObs = this.pluginListSource.asObservable()

  constructor() { }

  // Method to add a plugin to the list
  addPlugin(newPlugin: UserPlugin): void {
    // const newPlugin = { id, title, desc };
    this.pluginList.push(newPlugin)
    this.updatePluginList()
  }

  // Method to delete a plugin from the list by its id
  deletePlugin(id: number): void {
    const indexToDelete = this.pluginList.findIndex(plugin => plugin.id === id)
    if (indexToDelete !== -1) {
      this.pluginList.splice(indexToDelete, 1)
    }
    this.updatePluginList()
  }

  // Method to get the list of plugins
  getPluginList(): UserPlugin[] {
    // return this.pluginList;
    return this.pluginListSource.getValue()
  }

  private updatePluginList() {
    this.pluginListSource.next(this.pluginList)
  }
}
