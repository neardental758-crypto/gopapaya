import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BleEsp32Component } from './ble-esp32.component';

describe('BleEsp32Component', () => {
  let component: BleEsp32Component;
  let fixture: ComponentFixture<BleEsp32Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BleEsp32Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BleEsp32Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
