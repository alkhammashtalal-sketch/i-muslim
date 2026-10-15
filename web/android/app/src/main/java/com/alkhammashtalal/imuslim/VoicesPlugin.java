package com.alkhammashtalal.imuslim;

import android.os.Handler;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import android.speech.tts.Voice;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Set;

/**
 * The voices on the phone itself (reply 0067; web/src/native/android/speech.ts): the speech engine's voices that need
 * no network and whose data is installed. A reply is read only with one of these, as the iPhone reads it on the device
 * (CLAUDE.md §11: no server): an engine may otherwise speak a language it has no voice for by sending the text to its
 * servers. A language without one has no voice in the app, which then says how to install one.
 */
@CapacitorPlugin(name = "AndroidVoices")
public class VoicesPlugin extends Plugin {

    @PluginMethod
    public void installed(PluginCall call) {
        final TextToSpeech[] engine = new TextToSpeech[1];
        final Handler main = new Handler(Looper.getMainLooper());
        main.post(() -> engine[0] = new TextToSpeech(getContext(), (status) -> main.post(() -> {
            JSArray out = new JSArray();
            TextToSpeech tts = engine[0];
            if (status == TextToSpeech.SUCCESS && tts != null) {
                try {
                    Set<Voice> voices = tts.getVoices();
                    if (voices != null) {
                        for (Voice v : voices) {
                            Set<String> f = v.getFeatures();
                            if (v.isNetworkConnectionRequired() || (f != null && f.contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED))) continue;
                            JSObject o = new JSObject();
                            o.put("name", v.getName());
                            o.put("lang", v.getLocale().toLanguageTag());
                            out.put(o);
                        }
                    }
                } catch (RuntimeException e) {
                    // An engine that cannot list its voices: none counts as on the phone.
                }
            }
            if (tts != null) tts.shutdown();
            JSObject ret = new JSObject();
            ret.put("voices", out);
            call.resolve(ret);
        })));
    }
}
