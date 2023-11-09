import { TestBed } from '@angular/core/testing';

import { UserPluginListService } from './user-plugin-list.service';

describe('PluginListService', () => {
  let service: UserPluginListService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UserPluginListService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
