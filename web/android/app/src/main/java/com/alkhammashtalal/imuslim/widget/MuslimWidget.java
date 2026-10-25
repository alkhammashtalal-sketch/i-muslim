package com.alkhammashtalal.imuslim.widget;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.os.Bundle;

/**
 * The eight widgets of «مسلم» on Android (reply 0067), the iPhone's eight (web/ios/App/MuslimWidgets/Widgets.swift):
 * each its own provider, as Android lists them one by one when adding a widget. What they show and how is Widgets.java
 * and WidgetPainter.java; the sizes are the iPhone's (small, medium, large), and each can be resized.
 * Add-on 0072-add10 §4: «اسم الله لليوم» in the iPhone's three sizes and «من أقوال السلف» in its two, one provider a
 * size, as the iPhone's gallery offers each size of a widget apart.
 */
public abstract class MuslimWidget extends AppWidgetProvider {

    abstract String kind();

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        Widgets.update(ctx, mgr, kind(), ids);
        Widgets.schedule(ctx);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context ctx, AppWidgetManager mgr, int id, Bundle options) {
        Widgets.update(ctx, mgr, kind(), new int[] { id });
    }

    @Override
    public void onDisabled(Context ctx) {
        Widgets.schedule(ctx);
    }

    /** 1. The next prayer (small). */
    public static final class Next extends MuslimWidget {
        @Override
        String kind() {
            return "next";
        }
    }

    /** 2. Today's times (large). */
    public static final class Times extends MuslimWidget {
        @Override
        String kind() {
            return "times";
        }
    }

    /** 3. The date (small). */
    public static final class Date extends MuslimWidget {
        @Override
        String kind() {
            return "date";
        }
    }

    /** 4. The ayah of the day (medium). */
    public static final class Ayah extends MuslimWidget {
        @Override
        String kind() {
            return "ayah";
        }
    }

    /** 5. The hadith of the day (medium). */
    public static final class Hadith extends MuslimWidget {
        @Override
        String kind() {
            return "hadith";
        }
    }

    /** 6. The tasbih (small): «+١» counts in the widget itself. */
    public static final class Tasbih extends MuslimWidget {
        @Override
        String kind() {
            return "tasbih";
        }
    }

    /** 7. The adhkar of the time (small). */
    public static final class Adhkar extends MuslimWidget {
        @Override
        String kind() {
            return "adhkar";
        }
    }

    /** 8. «أذكار المواقف» (large): eight buttons, each opening its situation. */
    public static final class Mawaqif extends MuslimWidget {
        @Override
        String kind() {
            return "mawaqif";
        }
    }

    /** 9. «اسم الله لليوم», small: the name in the shamsa and «<n> من 96» (add-on 0072-add10 §1). */
    public static final class NameSmall extends MuslimWidget {
        @Override
        String kind() {
            return "nameSmall";
        }
    }

    /** 9. «اسم الله لليوم», medium: the shamsa and the evidence beside it, «التالي» between the first two pages. */
    public static final class NameMedium extends MuslimWidget {
        @Override
        String kind() {
            return "nameMedium";
        }
    }

    /** 9. «اسم الله لليوم», large: the name's pages one by one, «التالي» and «شارك» on each. */
    public static final class NameLarge extends MuslimWidget {
        @Override
        String kind() {
            return "nameLarge";
        }
    }

    /** 10. «من أقوال السلف», medium (add-on 0072-add10 §2). */
    public static final class SalafMedium extends MuslimWidget {
        @Override
        String kind() {
            return "salafMedium";
        }
    }

    /** 10. «من أقوال السلف», large. */
    public static final class SalafLarge extends MuslimWidget {
        @Override
        String kind() {
            return "salafLarge";
        }
    }
}
