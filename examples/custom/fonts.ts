// Кастомный JSON, имитирующий ответ личного бэкенда пользователя.
// Структура намеренно отличается от Google, чтобы показать работу setPattern().
// Каждый шрифт содержит несколько начертаний (styles): вес (weight) и наклон (style),
// а также реальную ссылку на бинарник (file) с fonts.gstatic.com.

export interface CustomFontStyle {
  weight: string;
  style: "normal" | "italic";
  file: string;
}

export interface CustomFontsPayload {
  status: string;
  data: {
    fonts: Array<{
      name: string;
      type: string;
      styles: CustomFontStyle[];
    }>;
  };
}

export const customFontsJson: CustomFontsPayload = {
  status: "ok",
  data: {
    fonts: [
      {
        name: "Roboto",
        type: "sans-serif",
        styles: [
          { weight: "300", style: "italic", file: "https://fonts.gstatic.com/s/roboto/v51/KFO5CnqEu92Fr1Mu53ZEC9_Vu3r1gIhOszmkC3kaWzU.woff2" },
          { weight: "400", style: "italic", file: "https://fonts.gstatic.com/s/roboto/v51/KFO5CnqEu92Fr1Mu53ZEC9_Vu3r1gIhOszmkC3kaWzU.woff2" },
          { weight: "700", style: "italic", file: "https://fonts.gstatic.com/s/roboto/v51/KFO5CnqEu92Fr1Mu53ZEC9_Vu3r1gIhOszmkC3kaWzU.woff2" },
          { weight: "100", style: "normal", file: "https://fonts.gstatic.com/s/roboto/v51/KFO7CnqEu92Fr1ME7kSn66aGLdTylUAMa3GUBGEe.woff2" },
          { weight: "300", style: "normal", file: "https://fonts.gstatic.com/s/roboto/v51/KFO7CnqEu92Fr1ME7kSn66aGLdTylUAMa3GUBGEe.woff2" },
          { weight: "400", style: "normal", file: "https://fonts.gstatic.com/s/roboto/v51/KFO7CnqEu92Fr1ME7kSn66aGLdTylUAMa3GUBGEe.woff2" },
          { weight: "500", style: "normal", file: "https://fonts.gstatic.com/s/roboto/v51/KFO7CnqEu92Fr1ME7kSn66aGLdTylUAMa3GUBGEe.woff2" },
          { weight: "700", style: "normal", file: "https://fonts.gstatic.com/s/roboto/v51/KFO7CnqEu92Fr1ME7kSn66aGLdTylUAMa3GUBGEe.woff2" },
          { weight: "900", style: "normal", file: "https://fonts.gstatic.com/s/roboto/v51/KFO7CnqEu92Fr1ME7kSn66aGLdTylUAMa3GUBGEe.woff2" },
        ],
      },
      {
        name: "Open Sans",
        type: "sans-serif",
        styles: [
          { weight: "400", style: "italic", file: "https://fonts.gstatic.com/s/opensans/v44/memtYaGs126MiZpBA-UFUIcVXSCEkx2cmqvXlWqWtE6F15M.woff2" },
          { weight: "600", style: "italic", file: "https://fonts.gstatic.com/s/opensans/v44/memtYaGs126MiZpBA-UFUIcVXSCEkx2cmqvXlWqWtE6F15M.woff2" },
          { weight: "800", style: "italic", file: "https://fonts.gstatic.com/s/opensans/v44/memtYaGs126MiZpBA-UFUIcVXSCEkx2cmqvXlWqWtE6F15M.woff2" },
          { weight: "300", style: "normal", file: "https://fonts.gstatic.com/s/opensans/v44/memvYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTSKmu1aB.woff2" },
          { weight: "400", style: "normal", file: "https://fonts.gstatic.com/s/opensans/v44/memvYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTSKmu1aB.woff2" },
          { weight: "600", style: "normal", file: "https://fonts.gstatic.com/s/opensans/v44/memvYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTSKmu1aB.woff2" },
          { weight: "700", style: "normal", file: "https://fonts.gstatic.com/s/opensans/v44/memvYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTSKmu1aB.woff2" },
          { weight: "800", style: "normal", file: "https://fonts.gstatic.com/s/opensans/v44/memvYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTSKmu1aB.woff2" },
        ],
      },
      {
        name: "Montserrat",
        type: "sans-serif",
        styles: [
          { weight: "400", style: "italic", file: "https://fonts.gstatic.com/s/montserrat/v31/JTUQjIg1_i6t8kCHKm459WxRxC7mw9c.woff2" },
          { weight: "600", style: "italic", file: "https://fonts.gstatic.com/s/montserrat/v31/JTUQjIg1_i6t8kCHKm459WxRxC7mw9c.woff2" },
          { weight: "200", style: "normal", file: "https://fonts.gstatic.com/s/montserrat/v31/JTUSjIg1_i6t8kCHKm459WRhyzbi.woff2" },
          { weight: "400", style: "normal", file: "https://fonts.gstatic.com/s/montserrat/v31/JTUSjIg1_i6t8kCHKm459WRhyzbi.woff2" },
          { weight: "500", style: "normal", file: "https://fonts.gstatic.com/s/montserrat/v31/JTUSjIg1_i6t8kCHKm459WRhyzbi.woff2" },
          { weight: "700", style: "normal", file: "https://fonts.gstatic.com/s/montserrat/v31/JTUSjIg1_i6t8kCHKm459WRhyzbi.woff2" },
          { weight: "900", style: "normal", file: "https://fonts.gstatic.com/s/montserrat/v31/JTUSjIg1_i6t8kCHKm459WRhyzbi.woff2" },
        ],
      },
      {
        name: "Lato",
        type: "sans-serif",
        styles: [
          { weight: "400", style: "italic", file: "https://fonts.gstatic.com/s/lato/v25/S6u8w4BMUTPHjxsAUi-qJCY.woff2" },
          { weight: "900", style: "italic", file: "https://fonts.gstatic.com/s/lato/v25/S6u_w4BMUTPHjxsI3wi_FQft1dw.woff2" },
          { weight: "100", style: "normal", file: "https://fonts.gstatic.com/s/lato/v25/S6u8w4BMUTPHh30AUi-qJCY.woff2" },
          { weight: "300", style: "normal", file: "https://fonts.gstatic.com/s/lato/v25/S6u9w4BMUTPHh7USSwaPGR_p.woff2" },
          { weight: "400", style: "normal", file: "https://fonts.gstatic.com/s/lato/v25/S6uyw4BMUTPHjxAwXjeu.woff2" },
          { weight: "700", style: "normal", file: "https://fonts.gstatic.com/s/lato/v25/S6u9w4BMUTPHh6UVSwaPGR_p.woff2" },
          { weight: "900", style: "normal", file: "https://fonts.gstatic.com/s/lato/v25/S6u9w4BMUTPHh50XSwaPGR_p.woff2" },
        ],
      },
      {
        name: "Poppins",
        type: "sans-serif",
        styles: [
          { weight: "400", style: "italic", file: "https://fonts.gstatic.com/s/poppins/v24/pxiGyp8kv8JHgFVrJJLucXtAKPY.woff2" },
          { weight: "700", style: "italic", file: "https://fonts.gstatic.com/s/poppins/v24/pxiDyp8kv8JHgFVrJJLmy15VFteOcEg.woff2" },
          { weight: "200", style: "normal", file: "https://fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLFj_Z11lFc-K.woff2" },
          { weight: "400", style: "normal", file: "https://fonts.gstatic.com/s/poppins/v24/pxiEyp8kv8JHgFVrJJbecmNE.woff2" },
          { weight: "500", style: "normal", file: "https://fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLGT9Z11lFc-K.woff2" },
          { weight: "700", style: "normal", file: "https://fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLCz7Z11lFc-K.woff2" },
          { weight: "800", style: "normal", file: "https://fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLDD4Z11lFc-K.woff2" },
        ],
      },
      {
        name: "Merriweather",
        type: "serif",
        styles: [
          { weight: "400", style: "italic", file: "https://fonts.gstatic.com/s/merriweather/v33/u-4c0qyriQwlOrhSvowK_l5-eTxCVx0ZbwLvKH2Gk9hLmp0v5yA-xXPqCzLvF-adrGGj.woff2" },
          { weight: "700", style: "italic", file: "https://fonts.gstatic.com/s/merriweather/v33/u-4c0qyriQwlOrhSvowK_l5-eTxCVx0ZbwLvKH2Gk9hLmp0v5yA-xXPqCzLvF-adrGGj.woff2" },
          { weight: "400", style: "normal", file: "https://fonts.gstatic.com/s/merriweather/v33/u-4e0qyriQwlOrhSvowK_l5UcA6zuSYEqOzpPe3HOZJ5eX1WtLaQwmYiSeqnJ-mFqA.woff2" },
          { weight: "700", style: "normal", file: "https://fonts.gstatic.com/s/merriweather/v33/u-4e0qyriQwlOrhSvowK_l5UcA6zuSYEqOzpPe3HOZJ5eX1WtLaQwmYiSeqnJ-mFqA.woff2" },
          { weight: "900", style: "normal", file: "https://fonts.gstatic.com/s/merriweather/v33/u-4e0qyriQwlOrhSvowK_l5UcA6zuSYEqOzpPe3HOZJ5eX1WtLaQwmYiSeqnJ-mFqA.woff2" },
        ],
      },
      {
        name: "Playfair Display",
        type: "serif",
        styles: [
          { weight: "400", style: "italic", file: "https://fonts.gstatic.com/s/playfairdisplay/v40/nuFkD-vYSZviVYUb_rj3ij__anPXDTnohkk72xU.woff2" },
          { weight: "700", style: "italic", file: "https://fonts.gstatic.com/s/playfairdisplay/v40/nuFkD-vYSZviVYUb_rj3ij__anPXDTnohkk72xU.woff2" },
          { weight: "400", style: "normal", file: "https://fonts.gstatic.com/s/playfairdisplay/v40/nuFiD-vYSZviVYUb_rj3ij__anPXDTjYgFE_.woff2" },
          { weight: "500", style: "normal", file: "https://fonts.gstatic.com/s/playfairdisplay/v40/nuFiD-vYSZviVYUb_rj3ij__anPXDTjYgFE_.woff2" },
          { weight: "700", style: "normal", file: "https://fonts.gstatic.com/s/playfairdisplay/v40/nuFiD-vYSZviVYUb_rj3ij__anPXDTjYgFE_.woff2" },
          { weight: "900", style: "normal", file: "https://fonts.gstatic.com/s/playfairdisplay/v40/nuFiD-vYSZviVYUb_rj3ij__anPXDTjYgFE_.woff2" },
        ],
      },
      {
        name: "Nunito",
        type: "sans-serif",
        styles: [
          { weight: "400", style: "italic", file: "https://fonts.gstatic.com/s/nunito/v32/XRXX3I6Li01BKofIMNaORs71cA.woff2" },
          { weight: "700", style: "italic", file: "https://fonts.gstatic.com/s/nunito/v32/XRXX3I6Li01BKofIMNaORs71cA.woff2" },
          { weight: "200", style: "normal", file: "https://fonts.gstatic.com/s/nunito/v32/XRXV3I6Li01BKofIOOaBXso.woff2" },
          { weight: "400", style: "normal", file: "https://fonts.gstatic.com/s/nunito/v32/XRXV3I6Li01BKofIOOaBXso.woff2" },
          { weight: "600", style: "normal", file: "https://fonts.gstatic.com/s/nunito/v32/XRXV3I6Li01BKofIOOaBXso.woff2" },
          { weight: "800", style: "normal", file: "https://fonts.gstatic.com/s/nunito/v32/XRXV3I6Li01BKofIOOaBXso.woff2" },
          { weight: "1000", style: "normal", file: "https://fonts.gstatic.com/s/nunito/v32/XRXV3I6Li01BKofIOOaBXso.woff2" },
        ],
      },
      {
        name: "Roboto Mono",
        type: "monospace",
        styles: [
          { weight: "400", style: "italic", file: "https://fonts.gstatic.com/s/robotomono/v31/L0x7DF4xlVMF-BfR8bXMIjhOm3CWWoKC.woff2" },
          { weight: "700", style: "italic", file: "https://fonts.gstatic.com/s/robotomono/v31/L0x7DF4xlVMF-BfR8bXMIjhOm3CWWoKC.woff2" },
          { weight: "300", style: "normal", file: "https://fonts.gstatic.com/s/robotomono/v31/L0x5DF4xlVMF-BfR8bXMIjhGq3-OXg.woff2" },
          { weight: "400", style: "normal", file: "https://fonts.gstatic.com/s/robotomono/v31/L0x5DF4xlVMF-BfR8bXMIjhGq3-OXg.woff2" },
          { weight: "500", style: "normal", file: "https://fonts.gstatic.com/s/robotomono/v31/L0x5DF4xlVMF-BfR8bXMIjhGq3-OXg.woff2" },
          { weight: "700", style: "normal", file: "https://fonts.gstatic.com/s/robotomono/v31/L0x5DF4xlVMF-BfR8bXMIjhGq3-OXg.woff2" },
        ],
      },
      {
        name: "Source Code Pro",
        type: "monospace",
        styles: [
          { weight: "400", style: "italic", file: "https://fonts.gstatic.com/s/sourcecodepro/v31/HI_jiYsKILxRpg3hIP6sJ7fM7PqlOPHYvDP_W9O7GQTTbI1bQ10YVJg.woff2" },
          { weight: "300", style: "normal", file: "https://fonts.gstatic.com/s/sourcecodepro/v31/HI_SiYsKILxRpg3hIP6sJ7fM7PqlMOvWjMY.woff2" },
          { weight: "400", style: "normal", file: "https://fonts.gstatic.com/s/sourcecodepro/v31/HI_SiYsKILxRpg3hIP6sJ7fM7PqlMOvWjMY.woff2" },
          { weight: "600", style: "normal", file: "https://fonts.gstatic.com/s/sourcecodepro/v31/HI_SiYsKILxRpg3hIP6sJ7fM7PqlMOvWjMY.woff2" },
          { weight: "900", style: "normal", file: "https://fonts.gstatic.com/s/sourcecodepro/v31/HI_SiYsKILxRpg3hIP6sJ7fM7PqlMOvWjMY.woff2" },
        ],
      },
    ],
  },
};
