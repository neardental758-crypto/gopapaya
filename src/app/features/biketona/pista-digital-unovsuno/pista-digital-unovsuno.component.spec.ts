import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PistaDigitalUnovsunoComponent } from './pista-digital-unovsuno.component';

describe('PistaDigitalUnovsunoComponent', () => {
  let component: PistaDigitalUnovsunoComponent;
  let fixture: ComponentFixture<PistaDigitalUnovsunoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PistaDigitalUnovsunoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PistaDigitalUnovsunoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
