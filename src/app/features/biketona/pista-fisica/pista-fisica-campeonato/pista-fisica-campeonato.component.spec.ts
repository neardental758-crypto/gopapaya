import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PistaDigitalCampeonatoComponent } from './pista-digital-campeonato.component';

describe('PistaDigitalCampeonatoComponent', () => {
  let component: PistaDigitalCampeonatoComponent;
  let fixture: ComponentFixture<PistaDigitalCampeonatoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PistaDigitalCampeonatoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PistaDigitalCampeonatoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
