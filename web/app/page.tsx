import styles from "../src/styles/home.module.css";

export default function HomePage() {
  return (
    <>
      {/* TOP BAR */}
      <header className={styles.topbar}>
        <div className={styles.container}>
          <div className={styles.topbarRow}>
            <div className={styles.brand}>
              <div className={styles.logo}>ABC</div>
            </div>

            <nav className={styles.nav}>
              <a href="#">Đặt</a>
              <a href="#">Trang</a>
              <a href="#">Hỗ trợ</a>
              <a href="#">In/Vé SMS</a>
              <a href="#">Huỷ vé</a>
              <a href="#">Vietnamese</a>
              <a className={styles.avatar} href="#">
                👤
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* HERO */}
      <main>
        <section className={styles.hero}>
          <div className={styles.heroOverlay} />

          <div className={`${styles.container} ${styles.heroInner}`}>
            <div className={styles.breadcrumb}>
              Đặt Vé Xe <span className={styles.sep}>›</span> Vé xe khách{" "}
              <span className={styles.sep}>›</span> Nhà xe <span className={styles.sep}>›</span>{" "}
              <b>Phương Trang</b>
            </div>

            <h1 className={styles.title}>Phương Trang - FUTA Bus Lines</h1>

            <div className={styles.ratingRow}>
              <span className={styles.ratingBadge}>
                <b>4.33</b> <span className={styles.star}>★</span>
              </span>
              <span className={styles.review}>(2152 Nhận xét)</span>
            </div>

            <div className={styles.searchWrap}>
              <div className={styles.searchCard}>
                <div className={styles.searchGrid}>
                  <div className={styles.field}>
                    <label>Từ</label>
                    <div className={styles.inputWrap}>
                      <span className={styles.icon}>🚌</span>
                      <input placeholder="VD: TP.HCM" />
                    </div>
                  </div>

                  <div className={styles.swapCol}>
                    <button className={styles.swapBtn} type="button" aria-label="Đổi điểm">
                      ⇄
                    </button>
                  </div>

                  <div className={styles.field}>
                    <label>Đến</label>
                    <div className={styles.inputWrap}>
                      <span className={styles.icon}>🚌</span>
                      <input placeholder="VD: Đà Lạt" />
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label>Ngày đi</label>
                    <div className={styles.inputWrap}>
                      <span className={styles.icon}>📅</span>
                      <input type="date" />
                    </div>
                  </div>

                  <div className={styles.ctaCol}>
                    <button className={styles.ctaBtn} type="button">
                      TÌM KIẾM XE
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.trustRow}>
              <div className={styles.trustItem}>
                <span className={styles.trustIcon}>✅</span> Đối tác đặt vé chính thức
              </div>
              <div className={styles.trustItem}>
                <span className={styles.trustIcon}>🏷️</span> Cam kết giá tốt nhất
              </div>
              <div className={styles.trustItem}>
                <span className={styles.trustIcon}>🪑</span> Chọn ghế theo ý bạn
              </div>
            </div>
          </div>
        </section>

        {/* PROMO */}
        <section className={`${styles.container} ${styles.section}`}>
          <h2 className={styles.h2}>ƯU ĐÃI</h2>

          <div className={styles.promoGrid}>
            <div className={styles.promoCard}>
              <div className={styles.promoBadge}>BUS</div>
              <div className={styles.promoTitle}>Tiết kiệm tới 30%</div>
              <div className={styles.promoDesc}>khi đặt vé xe lần đầu (demo)</div>
              <div className={styles.promoFooter}>Có hiệu lực đến ngày 31/…</div>
            </div>

            <div className={`${styles.promoCard} ${styles.promoGreen}`}>
              <div className={styles.promoBadge}>BUS</div>
              <div className={styles.promoTitle}>Tiết kiệm 20%</div>
              <div className={styles.promoDesc}>cho lần đặt vé tiếp theo (demo)</div>
              <div className={styles.promoFooter}>Có hiệu lực đến ngày 31/…</div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.containerFooter}>
          <div>
            <b>Nhà xe ABC</b>
            <div className={styles.footerMuted}>Đặt vé • Chọn ghế • Vé QR</div>
          </div>
          <div className={styles.footerMuted}>© {new Date().getFullYear()}</div>
        </div>
      </footer>
    </>
  );
}
