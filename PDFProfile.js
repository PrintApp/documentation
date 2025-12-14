import Data from './Data'
import Socks from '../utils/Socks'
import Utils from '../utils/Utils'

export default class PDFProfile extends Data {
    static NAME = 'print-app-pdf-profile';
    
    constructor (options = {}) {
        super(options);
        
        this._id = options.id || Data.composeId(Utils.generateReference(), Data.PDF_PROFILE);
        this._created = options.created || Date.now();
        this._modified = options.modified || Date.now();
        this._isDefault = options.isDefault || false;

        // general..
        this._compatibility = options.compatibility || '1.7';
        this._colorProfile = options.colorProfile || '';
        this._embedIccProfile = options.embedIccProfile ?? true;
        this._renderSpotColors = options.renderSpotColors ?? true;
        this._renderInvisibleLayers = options.renderInvisibleLayers ?? true;
        this._renderMarks = options.renderMarks ?? true;
        this._includeScreenshot = options.includeScreenshot ?? false;

        // images..
        this._downsampleImages = options.downsampleImages ?? false;
        this._convertImageColorSpace = options.convertImageColorSpace ?? false;
        this._downsampleResolution = options.downsampleResolution ?? 300;
        this._jpegQuality = options.jpegQuality ?? 91;
        this._honorImageIccProfile = options.honorImageIccProfile ?? true;
        this._embedIccProfileInImages = options.embedIccProfileInImages ?? false;
        this._interpolateImages = options.interpolateImages ?? false;
        this._imageRenderingIntent = options.imageRenderingIntent ?? 'Auto';

        // fonts..
        this._embedFonts = options.embedFonts ?? true;
        this._subsetFonts = options.subsetFonts ?? true;
        this._flattenFonts = options.flattenFonts ?? false;

        // encryption..
        this._requirePassword = options.requirePassword ?? false;
        this._userPassword = options.userPassword ?? null;


    }
    get id () { return this._id; }
    get created () { return this._created; }
    get modified () { return this._modified; }
    get compatibility () { return this._compatibility; }
    get colorProfile () { return this._colorProfile; }
    get embedIccProfile () { return this._embedIccProfile; }
    get renderSpotColors () { return this._renderSpotColors; }
    get renderInvisibleLayers () { return this._renderInvisibleLayers; }
    get downsampleImages () { return this._downsampleImages; }
    get convertImageColorSpace () { return this._convertImageColorSpace; }
    get downsampleResolution () { return this._downsampleResolution; }
    get jpegQuality () { return this._jpegQuality; }
    get honorImageIccProfile () { return this._honorImageIccProfile; }
    get embedIccProfileInImages () { return this._embedIccProfileInImages; }
    get interpolateImages () { return this._interpolateImages; }
    get imageRenderingIntent () { return this._imageRenderingIntent; }
    get embedFonts () { return this._embedFonts; }
    get subsetFonts () { return this._subsetFonts; }
    get requirePassword () { return this._requirePassword; }
    get userPassword () { return this._userPassword; }
    get renderMarks () { return this._renderMarks; }
    get includeScreenshot () { return this._includeScreenshot; }
    get flattenFonts () { return this._flattenFonts; }

    set compatibility (val) { this._compatibility = val; }
    set colorProfile (val) { this._colorProfile = val; }
    set embedIccProfile (val) { this._embedIccProfile = val; }
    set renderSpotColors (val) { this._renderSpotColors = val; }
    set renderInvisibleLayers (val) { this._renderInvisibleLayers = val; }
    set downsampleImages (val) { this._downsampleImages = val; }
    set convertImageColorSpace (val) { this._convertImageColorSpace = val; }
    set downsampleResolution (val) { this._downsampleResolution = val; }
    set jpegQuality (val) { this._jpegQuality = val; }
    set honorImageIccProfile (val) { this._honorImageIccProfile = val; }
    set embedIccProfileInImages (val) { this._embedIccProfileInImages = val; }
    set interpolateImages (val) { this._interpolateImages = val; }
    set imageRenderingIntent (val) { this._imageRenderingIntent = val; }
    set embedFonts (val) { this._embedFonts = val; }
    set subsetFonts (val) { this._subsetFonts = val; }
    set requirePassword (val) { this._requirePassword = val; }
    set userPassword (val) { this._userPassword = val; }
    set renderMarks (val) { this._renderMarks = val; }
    set includeScreenshot (val) { this._includeScreenshot = val; }
    set flattenFonts (val) { this._flattenFonts = val; }

    get isDefault() { return this._isDefault }

    get model() {
        return [
                { isLabel: true, value: 'general' },
                { isSelect: true, value: this._compatibility, id: 'compatibility',
                    options: [
                        { label: 'PDF 1.4', value: '1.4' },
                        { label: 'PDF 1.5', value: '1.5' },
                        { label: 'PDF 1.6', value: '1.6' },
                        { label: 'PDF 1.7', value: '1.7' },
                        { label: 'PDF 2.0', value: '2.0' },
                        { label: 'PDF/A-3a', value: 'PDF/A-3a' },
                        { label: 'PDF/UA-1', value: 'PDF/UA-1' },
                        { label: 'PDF/X-5n', value: 'PDF/X-5n' },
                    ],
                },
                { isSelect: true, value: this._colorProfile, id: 'colorProfile', options: [
                    { value: '', label: 'No Conversion' },
                    { value: 'sRGB', label: 'Device RGB' },
                    { value: 'cmyk', label: 'Device CMYK' },
                    
                    { value: 'cmyk-coated-fogra27', label: 'CMYK Coated FOGRA27' },
                    { value: 'cmyk-coated-fogra39', label: 'CMYK Coated FOGRA39' },
                    { value: 'cmyk-coated-gracol2006', label: 'CMYK Coated GRACoL 2006' },
                    { value: 'cmyk-eci-iso-coated-v2-300', label: 'CMYK ECI ISO Coated v2 300' },
                    { value: 'cmyk-eci-iso-coated-v2-eci', label: 'CMYK ECI ISO Coated v2 ECI' },
                    { value: 'cmyk-eci-iso-uncoated-yellowish', label: 'CMYK ECI ISO Uncoated Yellowish' },
                    { value: 'cmyk-eci-pso-coated-300-npscreen-iso12647', label: 'CMYK ECI PSO Coated 300 NPScreen ISO12647' },
                    { value: 'cmyk-eci-pso-coated-npscreen-iso12647', label: 'CMYK ECI PSO Coated NPScreen ISO12647' },
                    { value: 'cmyk-eci-pso-lwc-improved', label: 'CMYK ECI PSO LWC Improved' },
                    { value: 'cmyk-eci-pso-lwc-standard', label: 'CMYK ECI PSO LWC Standard' },
                    { value: 'cmyk-eci-pso-mfc-paper', label: 'CMYK ECI PSO MFC Paper' },
                    { value: 'cmyk-eci-pso-snp-paper', label: 'CMYK ECI PSO SNP Paper' },
                    { value: 'cmyk-eci-pso-uncoated-iso12647', label: 'CMYK ECI PSO Uncoated ISO12647' },
                    { value: 'cmyk-eci-pso-uncoated-npscreen-iso12647', label: 'CMYK ECI PSO Uncoated NPScreen ISO12647' },
                    { value: 'cmyk-eci-sc-paper', label: 'CMYK ECI SC Paper' },
                    { value: 'cmyk-japan-200-newspaper', label: 'CMYK Japan 200 Newspaper' },
                    { value: 'cmyk-japan-2001-coated', label: 'CMYK Japan 2001 Coated' },
                    { value: 'cmyk-japan-2001-uncoated', label: 'CMYK Japan 2001 Uncoated' },
                    { value: 'cmyk-japan-2003-web-coated', label: 'CMYK Japan 2003 Web Coated' },
                    { value: 'cmyk-japan-web-coated', label: 'CMYK Japan Web Coated' },
                    { value: 'cmyk-uncoated-fogra29', label: 'CMYK Uncoated FOGRA29' },
                    { value: 'cmyk-us-web-coated-swop', label: 'CMYK US Web Coated SWOP' },
                    { value: 'cmyk-us-web-uncoated', label: 'CMYK US Web Uncoated' },
                    { value: 'cmyk-web-coated-fogra28', label: 'CMYK Web Coated FOGRA28' },
                    { value: 'cmyk-web-coated-swop-2006-g3', label: 'CMYK Web Coated SWOP 2006 G3' },
                    { value: 'cmyk-web-coated-swop-2006-g5', label: 'CMYK Web Coated SWOP 2006 G5' } ]
                },
                { isBoolean: true, value: this._embedIccProfile, id: 'embedIccProfile' },
                { isBoolean: true, value: this._renderSpotColors, id: 'renderSpotColors' },
                { isBoolean: true, value: this._renderInvisibleLayers, id: 'renderInvisibleLayers' },
                { isBoolean: true, value: this._renderMarks, id: 'renderMarks' },
                { isBoolean: true, value: this._includeScreenshot, id: 'includeScreenshot' },

                { isLabel: true, value: 'images' },
                { isBoolean: true, value: this._downsampleImages, id: 'downsampleImages' },
                { isSlider: true, value: this._downsampleResolution, id: 'downsampleResolution', steps: 2, min: 72, max: 600, dependsOn: 'downsampleImages' },
                { isSlider: true, value: this._jpegQuality, id: 'jpegQuality', min: 10, max: 100, dependsOn: 'downsampleImages' },
                { isBoolean: true, value: this._convertImageColorSpace, id: 'convertImageColorSpace', dependsOn: 'colorProfile' },
                { isBoolean: true, value: this._embedIccProfileInImages, id: 'embedIccProfileInImages' },
                { isBoolean: true, value: this._honorImageIccProfile, id: 'honorImageIccProfile' },
                { isBoolean: true, value: this._interpolateImages, id: 'interpolateImages' },
                { isSelect: true, value: this._imageRenderingIntent, id: 'imageRenderingIntent',
                    options: [
                        { label: 'Auto', value: 'Auto' },
                        { label: 'Absolute Colorimetric', value: 'AbsoluteColorimetric' },
                        { label: 'Relative Colorimetric', value: 'RelativeColorimetric' },
                        { label: 'Saturation', value: 'Saturation' },
                        { label: 'Perceptual', value: 'Perceptual' },
                    ],
                },
            
                { isLabel: true, value: 'fonts' },
                { isBoolean: true, value: this._embedFonts, id: 'embedFonts' },
                { isBoolean: true, value: this._subsetFonts, id: 'subsetFonts', dependsOn: 'embedFonts' },
                { isBoolean: true, value: this._flattenFonts, id: 'flattenFonts' },

                { isLabel: true, value: 'security' },
                { isBoolean: true, value: this._requirePassword, id: 'requirePassword' },
                { isInput: true, value: this._userPassword || '', id: 'userPassword', dependsOn: 'requirePassword' },
                
            ];
    }
    
    get json() {
        let _ret = {
			...super.json,
            created: this._created,
            modified: this._modified,
            
            compatibility:this._compatibility,
            colorProfile:this._colorProfile,
            embedIccProfile:this._embedIccProfile,
            renderSpotColors:this._renderSpotColors,
            renderInvisibleLayers:this._renderInvisibleLayers,
            downsampleImages:this._downsampleImages,
            convertImageColorSpace:this._convertImageColorSpace,
            downsampleResolution:this._downsampleResolution,
            jpegQuality:this._jpegQuality,
            honorImageIccProfile:this._honorImageIccProfile,
            embedIccProfileInImages:this._embedIccProfileInImages,
            interpolateImages:this._interpolateImages,
            imageRenderingIntent:this._imageRenderingIntent,
            embedFonts:this._embedFonts,
            subsetFonts:this._subsetFonts,
            requirePassword:this._requirePassword,
            userPassword:this._userPassword,
            renderMarks:this._renderMarks,
            includeScreenshot:this._includeScreenshot,
            flattenFonts:this._flattenFonts,
        };
        return Utils.clone(_ret);
    }
    
    async save () {
        if (this.isDefault) return;
        let data = this.json;
        data.modified = Date.now();
		await Socks.sendAwait('designs', 'pdfprofile:save', { data });
    }
}