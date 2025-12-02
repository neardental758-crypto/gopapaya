import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PistaDigitalComponent } from './pista-digital.component';

describe('PistaDigitalComponent', () => {
  let component: PistaDigitalComponent;
  let fixture: ComponentFixture<PistaDigitalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PistaDigitalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PistaDigitalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
