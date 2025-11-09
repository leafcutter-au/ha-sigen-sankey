import { css, unsafeCSS } from 'lit';
import { MIN_VERTICAL_SECTION_H } from './const';

// https://lit.dev/docs/components/styles/
export default css`
    ha-card {
        overflow-x: auto;
        width: 100%;
        margin: 0;
    }
    .container {
        display: flex;
        position: relative;
        /* height: 210px; */
        padding: 8px;
        overflow: hidden;
    }
    .container.with-header {
        margin-top: -16px;
    }
    .container.vertical {
        flex-direction: column;
    }
    .section {
        flex: 1;
        flex-direction: column;
        position: relative;
        min-width: 0;
        max-width: 100%;
    }
    .wide .section:last-child {
        flex: initial;
    }
    /* In Sigenergy mode, let last section expand since labels are on bars */

    .vertical .section {
        display: flex;
        flex: initial;
        flex-direction: row-reverse;
        align-items: flex-start;
        max-width: 100%;
        width: 100%;
        height: ${unsafeCSS(MIN_VERTICAL_SECTION_H + 'px')};
    }
    .vertical .section:last-child {
        flex: 1;
    }
    .spacerv {
        transition: height 0.25s;
    }
    .vertical .spacerv {
        transition: width 0.25s;
    }
    .box {
        display: flex;
        align-items: center;
        position: relative;
        /* min-height: 1px; */
        transition: height 0.25s;
    }
    .vertical .box {
        flex-direction: column;
        transition: width 0.25s;
    }
    /* .box::before {
        content: "";
        position: absolute;
        top: -2px;
        bottom: -2px;
        left: -2px;
        right: -2px;
        background-color: var(--primary-color);
        opacity: 0.5;
        border-radius: 3px;
    } */
    .box div:first-child {
        display: flex;
        justify-content: center;
        align-items: center;
        overflow: hidden;
        background-color: var(--primary-color);
        width: var(--sankey-bar-width, 15px);
        height: 100%;
        cursor: pointer;
        border-radius: 3px;
    }
    .visual-style-sigenergy .box div:first-child {
        border-radius: 8px;
    }
    .vertical .box div:first-child {
        width: 100%;
        height: var(--sankey-bar-width, 15px);
    }
    .box.type-passthrough div:first-child {
        opacity: 0.4;
    }
    .box.type-passthrough div.hl:first-child {
        opacity: 0.85;
    }
    .box .label {
        flex: 1;
        display: flex;
        align-items: center;
        padding: 0 10px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .vertical .box .label {
        padding: 5px 0 0;
        flex-direction: column;
        white-space: normal;
        /* word-break: break-all; */
        text-align: center;
    }
    .box .label .name {
        font-style: italic;
        font-size: inherit;
    }
    .box .label .name a {
        position: sticky;
        z-index: 100;
        color: var(--primary-text-color);
    }
    .connectors {
        position: absolute;
        top: 0;
        left: var(--sankey-bar-width, 15px);
        right: 0;
        height: 100%;
        overflow: hidden;
    }
    .vertical .connectors {
        top: var(--sankey-bar-width, 15px);
        left: 0;
        bottom: 0;
        height: auto;
    }
    .connectors svg {
        position: absolute;
        left: -1px;
        width: 101%;
        height: 100%;
    }
    .vertical .connectors svg {
        top: -1px;
        left: 0;
        width: 100%;
        height: 101%;
    }

    /* Sigenergy-style label overlay */
    .visual-style-sigenergy .box .label {
        position: absolute;
        left: 0;
        top: 8px;
        width: var(--sankey-bar-width, 70px);
        padding: 0 4px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        z-index: 10;
        pointer-events: none;
    }

    .visual-style-sigenergy.vertical .box .label {
        width: 100%;
        height: var(--sankey-bar-width, 65px);
        left: 0;
        right: 0;
        top: 0;
        bottom: auto;
        padding: 4px 8px;
    }

    .visual-style-sigenergy .box .label .entity-type {
        font-size: 11px;
        font-weight: bold;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        margin-bottom: 8px;
        align-self: center;
        width: 60px;
        height: 24px;
        line-height: 24px;
        padding: 0 2px;
        color: var(--sankey-label-text-color, #ffffff);
        background-color: rgba(255, 255, 255, 0.4);
        border-radius: 8px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        box-sizing: border-box;
        text-align: center;
    }

    .visual-style-sigenergy .box .label .values {
        text-align: left;
        padding-left: 8px;
    }
        
    .visual-style-sigenergy .box .label .state {
        font-size: 15px;
        font-weight: bold;
        color: var(--sankey-label-text-color, #ffffff);
    }

    .visual-style-sigenergy .box .label .unit {
        font-size: 11px;
        color: var(--sankey-label-text-color, #ffffff);
        /* This margin applies when it's a span (inline) next to the state */
        margin-left: 4px;
    }

    /* When the unit is a div (block), it's on a new line, so remove the margin */
    .visual-style-sigenergy .box .label div.unit {
        margin-left: 0;
    }

    .visual-style-sigenergy .box .label .percentage {
        font-size: 11px;
        margin-top: 4px;
        color: var(--sankey-label-text-color, #ffffff);
    }

    .visual-style-sigenergy .box .label .name {
        display: none; /* Hide custom names in Sigenergy mode */
    }
`;
