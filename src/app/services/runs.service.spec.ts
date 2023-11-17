import { TestBed } from '@angular/core/testing';

import { RunsService } from './runs.service';

describe('RunsService', () => {
  let service: RunsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RunsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
