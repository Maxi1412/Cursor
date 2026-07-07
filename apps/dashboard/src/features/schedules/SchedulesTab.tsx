import { SlidersHorizontal } from 'lucide-react';
import { useSchedules, useToggleFeature, useToggleCatCfg } from '../../lib/queries';
import { CAP_ICON } from '../../lib/icons';
import { Toggle } from '../../components/Toggle';

/** Live projection of what's running now — one card per enabled feature. */
export function SchedulesTab() {
  const { data } = useSchedules();
  const toggleFeature = useToggleFeature();
  const toggleCat = useToggleCatCfg();
  const cards = data?.cards ?? [];

  return (
    <div className="md-sec">
      <div className="md-sec-head">
        <div>
          <div className="md-sec-title md-disp">Schedules</div>
          <div className="md-sec-sub">What&apos;s running now · set up in Settings</div>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="md-empty">
          <SlidersHorizontal size={34} />
          <p>
            Nothing running yet.
            <br />
            Turn features on in Settings.
          </p>
        </div>
      ) : (
        cards.map((card) => {
          const Ic = CAP_ICON[card.capability];
          const color = card.meta.color;
          return (
            <div key={card.capability} className="md-sch on">
              <div className="md-sch-top">
                <div className="md-sch-l">
                  <div className="md-sch-ic" style={{ color }}>
                    <Ic size={19} />
                  </div>
                  <div>
                    <div className="md-sch-name">{card.meta.name}</div>
                    <div className="md-sch-desc">{card.meta.freq}</div>
                  </div>
                </div>
                <Toggle
                  on
                  color={color}
                  onChange={() => toggleFeature.mutate({ key: card.capability, on: false })}
                />
              </div>
              <div className="md-sch-subs">
                {card.scopes.length === 0 ? (
                  <div className="md-sch-empty">No categories yet — pick some in Settings.</div>
                ) : (
                  card.scopes.map((s) => (
                    <div key={s.key} className="md-sch-sub">
                      <div className="md-sch-sub-l">
                        <span className="md-sch-sub-dot" style={{ background: color }} /> {s.label}
                      </div>
                      <Toggle
                        small
                        on
                        color={color}
                        onChange={() =>
                          toggleCat.mutate({
                            mode: s.mode,
                            cat: s.cat,
                            key: card.capability,
                            on: false,
                          })
                        }
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })
      )}

      <div className="md-sec-sub" style={{ padding: '10px 2px', lineHeight: 1.5 }}>
        Toggle one off to stop it. Pick which categories each runs on in Settings.
      </div>
    </div>
  );
}
